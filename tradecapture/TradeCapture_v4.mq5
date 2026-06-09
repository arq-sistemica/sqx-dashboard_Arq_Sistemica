//+------------------------------------------------------------------+
//| TradeCapture_v4.mq5 — Envía trades cerrados a Supabase          |
//| v4.0 — Bugfixes: timestamp, O(n²), SL/TP, deal-type filter      |
//+------------------------------------------------------------------+
#property copyright "Arquitectura Sistemica"
#property version   "4.00"

input string UserToken    = "";           // Token personal (copiar desde el dashboard)
input string AccountLabel = "Principal";  // Nombre de esta cuenta MT5

string ENDPOINT = "https://ofrbktacgwbwsgpftoky.supabase.co/functions/v1/record-trade";
string accountId;

int OnInit() {
   accountId = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   if (UserToken == "") {
      Alert("TradeCapture v4: configurá tu UserToken en los inputs del EA");
      return INIT_FAILED;
   }
   string lastKey = "tc4_last_" + accountId;
   if (!GlobalVariableCheck(lastKey))
      Print("TC v4: Primera ejecución — enviando historial completo desde 2000");
   else
      Print("TC v4: Iniciado — modo incremental desde ", TimeToString((datetime)GlobalVariableGet(lastKey)));
   EventSetTimer(60);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { EventKillTimer(); }
void OnTrade() { ScanHistory(); }
void OnTimer() { ScanHistory(); }

//+------------------------------------------------------------------+
//| ScanHistory — recolecta tickets primero, luego procesa           |
//| Separar en dos fases evita que HistorySelectByPosition rompa     |
//| el iterador del loop externo.                                    |
//+------------------------------------------------------------------+
void ScanHistory() {
   string   lastKey   = "tc4_last_" + accountId;
   datetime lastCheck = (datetime)GlobalVariableGet(lastKey);
   datetime now       = TimeCurrent();
   bool     isFirstRun = (lastCheck == 0);
   datetime from      = isFirstRun ? D'2000.01.01 00:00:00' : lastCheck;

   if (!HistorySelect(from, now)) return;

   // --- Fase 1: recolectar tickets pendientes de envío ---
   int   total = HistoryDealsTotal();
   ulong tickets[];
   int   skipped = 0;

   for (int i = 0; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if (ticket == 0) continue;

      // Solo deals de cierre de posición
      if (HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      // Filtrar deals que no son trades reales (balance, depósito, crédito, etc.)
      long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if (dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      // Filtrar deals sin símbolo (ajustes de balance que pasan el filtro de tipo)
      string sym = HistoryDealGetString(ticket, DEAL_SYMBOL);
      if (sym == "") continue;

      string key = "tc4_" + IntegerToString(ticket);
      if (GlobalVariableCheck(key)) { skipped++; continue; }

      int sz = ArraySize(tickets);
      ArrayResize(tickets, sz + 1);
      tickets[sz] = ticket;
   }

   // --- Fase 2: procesar cada ticket (HistorySelectByPosition seguro aquí) ---
   int sent   = 0;
   int errors = 0;
   int nTickets = ArraySize(tickets);

   for (int i = 0; i < nTickets; i++) {
      bool ok = SendTrade(tickets[i]);

      if (ok) {
         GlobalVariableSet("tc4_" + IntegerToString(tickets[i]), 1);
         sent++;
         if (isFirstRun && sent % 10 == 0) {
            Sleep(1000);
            Print("TC v4 — Historial: ", sent, "/", nTickets, " trades enviados...");
         }
      } else {
         errors++;
         if (isFirstRun) {
            Print("TC v4 ERROR — Deteniendo scan inicial. Reintenta en 60s.");
            return; // No actualiza lastKey — retomará desde el mismo punto
         }
      }
   }

   if (sent > 0 || errors > 0)
      Print("TC v4: ", sent, " enviados | ", skipped, " ya procesados | ", errors, " errores");

   // FIX: solo actualizar timestamp si el ciclo terminó sin errores
   if (errors == 0) {
      if (isFirstRun && sent > 0)
         Print("TC v4: Historial completo enviado — ", sent, " trades");
      GlobalVariableSet(lastKey, (double)now);
   } else {
      Print("TC v4: Timestamp NO actualizado — ", errors, " trades con error se reintentarán en próximo ciclo");
   }
}

//+------------------------------------------------------------------+
//| SendTrade — arma y postea un deal de cierre                      |
//+------------------------------------------------------------------+
bool SendTrade(ulong ticket) {
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

   // Buscar deal de apertura con HistorySelectByPosition (O(k) por posición, no O(n²))
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

         // SL/TP reales desde la orden de entrada
         ulong openOrder = (ulong)HistoryDealGetInteger(tk2, DEAL_ORDER);
         if (HistoryOrderSelect(openOrder)) {
            sl = HistoryOrderGetDouble(openOrder, ORDER_SL);
            tp = HistoryOrderGetDouble(openOrder, ORDER_TP);
         }
         foundOpen = true;
         break;
      }
   }

   // No enviar con datos falsos — será reintentado en el próximo ciclo
   if (!foundOpen) {
      Print("TC v4 WARN — Deal de apertura no encontrado para ticket ", ticket,
            " (posId ", posId, "). Se omite para no guardar datos incorrectos.");
      return false;
   }

   // Escapar comillas en strings libres
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
      UserToken, ticket, accountId, AccountLabel,
      broker, server, currency,
      magic, symbol,
      (dealType == DEAL_TYPE_BUY ? "sell" : "buy"),
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

   if (res == 200) {
      Print("TC v4 OK — ticket ", ticket, " | magic ", magic, " | profit ", profit);
      return true;
   }

   Print("TC v4 ERROR ", res, " — ticket ", ticket, " | ", CharArrayToString(response));
   return false;
}
