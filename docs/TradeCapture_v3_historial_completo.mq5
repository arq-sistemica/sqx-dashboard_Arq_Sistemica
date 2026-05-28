//+------------------------------------------------------------------+
//| TradeCapture_v3.mq5 — Envía trades cerrados a Supabase           |
//| v3.1 — Historial completo en primera ejecución                   |
//+------------------------------------------------------------------+
#property copyright "Arquitectura Sistemica"
#property version   "3.10"

input string UserToken    = "";           // Token personal (copiar desde el dashboard)
input string AccountLabel = "Principal";  // Nombre de esta cuenta MT5

string ENDPOINT = "https://ofrbktacgwbwsgpftoky.supabase.co/functions/v1/record-trade";
string accountId;

int OnInit() {
   accountId = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   if (UserToken == "") {
      Alert("TradeCapture v3: configurá tu UserToken en los inputs del EA");
      return INIT_FAILED;
   }

   // Verificar si es la primera ejecución
   string lastKey = "tc3_last_" + accountId;
   bool isFirstRun = !GlobalVariableCheck(lastKey);

   if (isFirstRun)
      Print("TC v3: Primera ejecución — se enviará el historial completo de la cuenta");
   else
      Print("TC v3: Iniciado — modo incremental desde último check");

   EventSetTimer(60);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { EventKillTimer(); }

void OnTrade()  { ScanHistory(); }
void OnTimer()  { ScanHistory(); }

void ScanHistory() {
   string lastKey = "tc3_last_" + accountId;
   datetime lastCheck = (datetime)GlobalVariableGet(lastKey);
   datetime now = TimeCurrent();

   // Primera ejecución: escanear TODO el historial desde el año 2000
   bool isFirstRun = (lastCheck == 0);
   datetime from = isFirstRun ? D'2000.01.01 00:00:00' : lastCheck;

   if (!HistorySelect(from, now)) return;

   int total   = HistoryDealsTotal();
   int sent    = 0;
   int skipped = 0;
   int errors  = 0;

   for (int i = 0; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if (ticket == 0) continue;
      if (HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      // No reenviar trades ya procesados
      string key = "tc3_" + IntegerToString(ticket);
      if (GlobalVariableCheck(key)) { skipped++; continue; }

      bool ok = SendTrade(ticket);

      if (ok) {
         GlobalVariableSet(key, 1);
         sent++;
         // Rate limiting durante el scan inicial: pausa cada 10 trades
         if (isFirstRun && sent % 10 == 0) {
            Sleep(1000); // 1 segundo cada 10 trades para no sobrecargar la API
            Print("TC v3 — Progreso historial: ", sent, " trades enviados...");
         }
      } else {
         errors++;
         // Si hay error en primer scan, detenemos para no marcar como enviados
         if (isFirstRun) {
            Print("TC v3 ERROR — Deteniendo scan inicial. Reintentará en próximo ciclo.");
            return;
         }
      }
   }

   if (sent > 0)
      Print("TC v3: ", sent, " enviados | ", skipped, " ya procesados | ", errors, " errores");

   if (isFirstRun && errors == 0)
      Print("TC v3: Historial completo enviado OK — ", sent, " trades totales");

   GlobalVariableSet(lastKey, (double)now);
}

bool SendTrade(ulong ticket) {
   string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long   magic      = HistoryDealGetInteger(ticket, DEAL_MAGIC);
   string comment    = HistoryDealGetString(ticket, DEAL_COMMENT);
   double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double lots       = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
   datetime closeTime= (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   long posId        = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
   long dealType     = HistoryDealGetInteger(ticket, DEAL_TYPE);

   datetime openTime  = closeTime;
   double   openPrice = closePrice;

   // Buscar el deal de apertura para obtener precio y fecha de entrada
   int total = HistoryDealsTotal();
   for (int j = 0; j < total; j++) {
      ulong tk2 = HistoryDealGetTicket(j);
      if (HistoryDealGetInteger(tk2, DEAL_POSITION_ID) == posId &&
          HistoryDealGetInteger(tk2, DEAL_ENTRY) == DEAL_ENTRY_IN) {
         openTime  = (datetime)HistoryDealGetInteger(tk2, DEAL_TIME);
         openPrice = HistoryDealGetDouble(tk2, DEAL_PRICE);
         break;
      }
   }

   // Escapar comillas en comment
   StringReplace(comment, "\"", "'");

   string json = StringFormat(
      "{\"token\":\"%s\",\"ticket\":%I64u,\"account_id\":\"%s\",\"account_label\":\"%s\","
      "\"magic\":%I64d,\"symbol\":\"%s\",\"type\":\"%s\","
      "\"open_time\":\"%s\",\"close_time\":\"%s\","
      "\"lots\":%.2f,\"open_price\":%.5f,\"close_price\":%.5f,"
      "\"sl\":0,\"tp\":0,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,"
      "\"comment\":\"%s\"}",
      UserToken, ticket, accountId, AccountLabel,
      magic, symbol,
      (dealType == DEAL_TYPE_BUY ? "buy" : "sell"),
      TimeToString(openTime,  TIME_DATE|TIME_SECONDS),
      TimeToString(closeTime, TIME_DATE|TIME_SECONDS),
      lots, openPrice, closePrice,
      profit, commission, swap, comment
   );

   char body[], response[];
   string respHeaders;
   StringToCharArray(json, body, 0, StringLen(json));

   int res = WebRequest("POST", ENDPOINT,
                        "Content-Type: application/json\r\n",
                        5000, body, response, respHeaders);

   if (res == 200) {
      Print("TC v3 OK — ticket ", ticket);
      return true;
   } else {
      Print("TC v3 ERROR ", res, " — ticket ", ticket, " | ", CharArrayToString(response));
      return false;
   }
}
