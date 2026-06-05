//+------------------------------------------------------------------+
//| ImportHistory.mq5 — Script one-shot de importación histórica    |
//| Envía todos los trades cerrados desde una fecha a Supabase.     |
//| La Edge Function ignora duplicados (ON CONFLICT DO NOTHING).    |
//| Correr UNA VEZ por cuenta. TC v4 continúa desde ahí.           |
//+------------------------------------------------------------------+
#property script_show_inputs

input string UserToken    = "60ff2258-ebc7-4bfd-8931-2249ab0cebf9";
input string AccountLabel = "Demo_todos_juntos"; // Demo_Oro o Demo_todos_juntos
input string FromDate     = "2026.01.25";        // Fecha inicio (inclusive)

string ENDPOINT = "https://ofrbktacgwbwsgpftoky.supabase.co/functions/v1/record-trade";

void OnStart() {
   if (UserToken == "") { Alert("Configurá el UserToken"); return; }

   datetime from = StringToTime(FromDate);
   datetime to   = TimeCurrent();
   string   accountId = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   Print("=== ImportHistory iniciado ===");
   Print("Cuenta: ", accountId, " (", AccountLabel, ")");
   Print("Desde: ", TimeToString(from), " Hasta: ", TimeToString(to));

   if (!HistorySelect(from, to)) {
      Print("ERROR: HistorySelect falló");
      return;
   }

   int total    = HistoryDealsTotal();
   int enviados = 0;
   int omitidos = 0;
   int errores  = 0;

   Print("Deals en rango: ", total);

   for (int i = 0; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if (ticket == 0) continue;

      // Solo cierres de posición
      if (HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) { omitidos++; continue; }

      // Solo trades reales (buy/sell) — ignorar balance, depósito, crédito
      long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if (dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) { omitidos++; continue; }

      // Ignorar symbol vacío
      string sym = HistoryDealGetString(ticket, DEAL_SYMBOL);
      if (sym == "") { omitidos++; continue; }

      // Extraer datos
      long     magic      = HistoryDealGetInteger(ticket, DEAL_MAGIC);
      string   typeStr    = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";
      datetime openTime   = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      double   lots       = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double   price      = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double   profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double   commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double   swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
      string   comment    = HistoryDealGetString(ticket, DEAL_COMMENT);

      // Construir JSON
      string body = StringFormat(
         "{\"token\":\"%s\","
         "\"ticket\":%I64u,"
         "\"magic\":%I64d,"
         "\"symbol\":\"%s\","
         "\"type\":\"%s\","
         "\"open_time\":\"%s\","
         "\"close_time\":\"%s\","
         "\"lots\":%.2f,"
         "\"profit\":%.2f,"
         "\"commission\":%.2f,"
         "\"swap\":%.2f,"
         "\"account_id\":\"%s\","
         "\"account_label\":\"%s\","
         "\"comment\":\"%s\"}",
         UserToken,
         ticket,
         magic,
         sym,
         typeStr,
         TimeToString(openTime, TIME_DATE|TIME_SECONDS),
         TimeToString(openTime, TIME_DATE|TIME_SECONDS), // close_time = open_time del deal OUT
         lots,
         profit,
         commission,
         swap,
         accountId,
         AccountLabel,
         comment
      );

      // Enviar
      char   post[];  StringToCharArray(body, post, 0, StringLen(body));
      char   result[];
      string headers = "Content-Type: application/json\r\n";
      string resHeaders;
      int    timeout = 5000;

      int code = WebRequest("POST", ENDPOINT, headers, timeout, post, result, resHeaders);

      if (code == 200 || code == 201) {
         enviados++;
      } else {
         errores++;
         if (errores <= 5)
            Print("ERROR ticket=", ticket, " code=", code, " resp=", CharArrayToString(result));
      }

      // Progreso cada 50 trades
      if ((enviados + errores) % 50 == 0)
         Print("Progreso: ", enviados, " enviados / ", errores, " errores / ", omitidos, " omitidos");

      Sleep(50); // evitar flood
   }

   Print("=== ImportHistory completado ===");
   Print("Enviados: ", enviados);
   Print("Errores:  ", errores);
   Print("Omitidos: ", omitidos, " (entries/balance/sin symbol)");
   Alert("ImportHistory listo: ", enviados, " trades enviados, ", errores, " errores");
}
