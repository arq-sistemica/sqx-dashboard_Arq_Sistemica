//+------------------------------------------------------------------+
//| ImportHistory.mq5 — Importación histórica one-shot a Supabase   |
//| Correr UNA VEZ por cuenta. TC v4 continúa desde ahí.            |
//| Supabase ignora duplicados (ON CONFLICT DO NOTHING por ticket).  |
//+------------------------------------------------------------------+
#property script_show_inputs

input string UserToken    = "";            // Token personal (copiar desde el dashboard)
input string AccountLabel = "";            // Nombre de esta cuenta (ej: Demo_Oro)
input string FromDate     = "2000.01.01"; // Fecha inicio — dejar así para historial completo

string ENDPOINT = "https://ofrbktacgwbwsgpftoky.supabase.co/functions/v1/record-trade";

void OnStart() {
   if (UserToken == "")    { Alert("Configurá el UserToken");    return; }
   if (AccountLabel == "") { Alert("Configurá el AccountLabel"); return; }

   datetime from      = StringToTime(FromDate);
   datetime to        = TimeCurrent();
   string   accountId = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   Print("=== ImportHistory iniciado ===");
   Print("Cuenta: ", accountId, " (", AccountLabel, ")");
   Print("Desde:  ", TimeToString(from), " — Hasta: ", TimeToString(to));

   if (!HistorySelect(from, to)) { Print("ERROR: HistorySelect falló"); return; }

   // --- Fase 1: recolectar tickets válidos ---
   int   total = HistoryDealsTotal();
   ulong tickets[];

   for (int i = 0; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if (ticket == 0) continue;

      if (HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if (dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      string sym = HistoryDealGetString(ticket, DEAL_SYMBOL);
      if (sym == "") continue;

      int sz = ArraySize(tickets);
      ArrayResize(tickets, sz + 1);
      tickets[sz] = ticket;
   }

   int nTickets = ArraySize(tickets);
   Print("Trades a enviar: ", nTickets);

   // --- Fase 2: procesar cada ticket ---
   int enviados = 0;
   int omitidos = 0;
   int errores  = 0;

   for (int i = 0; i < nTickets; i++) {
      bool ok = SendTrade(tickets[i], accountId, AccountLabel, UserToken);

      if (ok) {
         enviados++;
      } else {
         omitidos++;
      }

      // Progreso cada 20 trades
      if ((i + 1) % 20 == 0)
         Print("Progreso: ", i + 1, "/", nTickets, " | enviados: ", enviados, " | omitidos: ", omitidos, " | errores: ", errores);

      Sleep(100);
   }

   Print("=== ImportHistory completado ===");
   Print("Enviados: ", enviados);
   Print("Omitidos (sin deal apertura): ", omitidos);
   Print("Errores HTTP: ", errores);
   Alert("ImportHistory listo — ", enviados, " enviados | ", omitidos, " omitidos | ", errores, " errores HTTP");
}

//+------------------------------------------------------------------+
//| SendTrade — misma lógica que TradeCapture_v4                     |
//+------------------------------------------------------------------+
bool SendTrade(ulong ticket, string accountId, string accountLabel, string userToken) {
   string   symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long     magic      = HistoryDealGetInteger(ticket, DEAL_MAGIC);
   string   comment    = HistoryDealGetString(ticket, DEAL_COMMENT);
   double   profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double   lots       = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double   closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double   commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double   swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
   datetime closeTime  = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   long     posId      = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
   long     dealType   = HistoryDealGetInteger(ticket, DEAL_TYPE);

   // Buscar deal de apertura
   datetime openTime  = 0;
   double   openPrice = 0;
   double   sl        = 0;
   double   tp        = 0;
   bool     foundOpen = false;

   if (HistorySelectByPosition(posId)) {
      int posDeals = HistoryDealsTotal();
      for (int j = 0; j < posDeals; j++) {
         ulong tk2 = HistoryDealGetTicket(j);
         if (HistoryDealGetInteger(tk2, DEAL_ENTRY) != DEAL_ENTRY_IN) continue;

         openTime  = (datetime)HistoryDealGetInteger(tk2, DEAL_TIME);
         openPrice = HistoryDealGetDouble(tk2, DEAL_PRICE);

         ulong openOrder = (ulong)HistoryDealGetInteger(tk2, DEAL_ORDER);
         if (HistoryOrderSelect(openOrder)) {
            sl = HistoryOrderGetDouble(openOrder, ORDER_SL);
            tp = HistoryOrderGetDouble(openOrder, ORDER_TP);
         }
         foundOpen = true;
         break;
      }
   }

   if (!foundOpen) {
      Print("WARN — Deal apertura no encontrado: ticket ", ticket, " (posId ", posId, ") — omitido");
      return false;
   }

   StringReplace(comment, "\"", "'");
   string broker   = AccountInfoString(ACCOUNT_COMPANY);
   string server   = AccountInfoString(ACCOUNT_SERVER);
   string currency = AccountInfoString(ACCOUNT_CURRENCY);
   StringReplace(broker, "\"", "'");
   StringReplace(server, "\"", "'");

   string json = StringFormat(
      "{\"token\":\"%s\",\"ticket\":%I64u,\"account_id\":\"%s\",\"account_label\":\"%s\","
      "\"account_broker\":\"%s\",\"account_server\":\"%s\",\"account_currency\":\"%s\","
      "\"magic\":%I64d,\"symbol\":\"%s\",\"type\":\"%s\","
      "\"open_time\":\"%s\",\"close_time\":\"%s\","
      "\"lots\":%.2f,\"open_price\":%.5f,\"close_price\":%.5f,"
      "\"sl\":%.5f,\"tp\":%.5f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,"
      "\"comment\":\"%s\"}",
      userToken, ticket, accountId, accountLabel,
      broker, server, currency,
      magic, symbol,
      (dealType == DEAL_TYPE_BUY ? "buy" : "sell"),
      TimeToString(openTime,  TIME_DATE|TIME_SECONDS),
      TimeToString(closeTime, TIME_DATE|TIME_SECONDS),
      lots, openPrice, closePrice,
      sl, tp, profit, commission, swap, comment
   );

   char   body[], response[];
   string respHeaders;
   StringToCharArray(json, body, 0, StringLen(json));

   int res = WebRequest("POST", ENDPOINT,
                        "Content-Type: application/json\r\n",
                        5000, body, response, respHeaders);

   if (res == 200 || res == 201) {
      Print("OK — ticket ", ticket, " | magic ", magic, " | ", symbol, " | profit ", profit);
      return true;
   }

   Print("ERROR ", res, " — ticket ", ticket, " | ", CharArrayToString(response));
   return false;
}
