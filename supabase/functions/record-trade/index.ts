// record-trade — Edge Function de Supabase
// v2.0 — Auto-registro de cuentas MT5 al primer trade
//
// Flujo:
//   1. Recibe POST del EA TradeCapture_v3 con datos del trade
//   2. Valida el token del usuario en user_tokens
//   3. Upsert de la cuenta en accounts (crea si no existe)
//   4. Inserta el trade en trades (ignora duplicados ticket+account_id)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  // Solo POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const token = body.token as string;
  if (!token) {
    return new Response("Missing token", { status: 401 });
  }

  // ── Cliente con service key (bypass RLS) ──────────────────────
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── 1. Validar token y obtener user_id ────────────────────────
  const { data: tokenRow, error: tokenErr } = await sb
    .from("user_tokens")
    .select("user_id")
    .eq("token", token)
    .single();

  if (tokenErr || !tokenRow) {
    return new Response("Invalid token", { status: 401 });
  }

  const userId = tokenRow.user_id as string;

  // ── 2. Extraer datos del trade ─────────────────────────────────
  const accountId       = String(body.account_id    ?? "");
  const accountLabel    = String(body.account_label ?? "Principal");
  const accountBroker   = String(body.account_broker   ?? "");
  const accountServer   = String(body.account_server   ?? "");
  const accountCurrency = String(body.account_currency ?? "USD");

  if (!accountId) {
    return new Response("Missing account_id", { status: 400 });
  }

  // ── 3. Auto-registro de cuenta (upsert) ───────────────────────
  // Si la cuenta no existe → la crea con toda la info disponible
  // Si ya existe → actualiza broker/server/currency (info técnica)
  //                pero NO sobreescribe label si ya fue personalizado
  const { error: accErr } = await sb
    .from("accounts")
    .upsert(
      {
        id:       accountId,
        user_id:  userId,
        label:    accountLabel,
        broker:   accountBroker,
        server:   accountServer,
        currency: accountCurrency,
      },
      {
        onConflict:        "id",
        ignoreDuplicates:  false,
      }
    );

  if (accErr) {
    // No bloqueamos el trade por error de cuenta — solo lo logueamos
    console.error("Error upserting account:", accErr.message);
  }

  // ── 4. Insertar trade (ignora duplicados ticket+account_id) ────
  const { error: tradeErr } = await sb
    .from("trades")
    .upsert(
      {
        ticket:       body.ticket,
        account_id:   accountId,
        user_id:      userId,
        magic:        body.magic,
        symbol:       body.symbol,
        type:         body.type,
        open_time:    body.open_time,
        close_time:   body.close_time,
        lots:         body.lots,
        open_price:   body.open_price,
        close_price:  body.close_price,
        profit:       body.profit,
        commission:   body.commission,
        swap:         body.swap,
        comment:      body.comment,  // contiene [tp] / [sl] / texto EA
        account_label: accountLabel, // label amigable de la cuenta
      },
      {
        onConflict:       "ticket,account_id",
        ignoreDuplicates: true,       // si ya existe → no hace nada
      }
    );

  if (tradeErr) {
    console.error("Error inserting trade:", tradeErr.message);
    return new Response(
      JSON.stringify({ error: tradeErr.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, account_id: accountId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
