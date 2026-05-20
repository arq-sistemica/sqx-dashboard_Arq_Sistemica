#!/usr/bin/env python3
"""
FED26 Trade Parser
Convierte CSV exportados por TradeCapture v2 en JSON para el dashboard SQX.
Agrupa por campo 'comment' (identificador único del bot) y mergea con db_data.json.

Uso:
  python fed26_parser.py --input fed26_trades_*.csv --output myfxbook_output.json
  python fed26_parser.py --input fed26_trades_*.csv --output myfxbook_output.json --merge-db db_data.json
  python fed26_parser.py --input fed26_trades_*.csv --dry-run
"""

import csv
import json
import re
import sys
import glob
import argparse

# Forzar UTF-8 en Windows cmd para evitar UnicodeEncodeError con simbolos especiales
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from collections import defaultdict
from datetime import datetime
from pathlib import Path


# Mapeo comment → id de estrategia en db_data.json
# Normalmente NO hace falta completar esto — el normalizador lo resuelve automático.
# Solo completar si hay un bot que no matchea solo con normalización.
# Ejemplo:
#   "Strategy_2_7_1_9_Improved_1_1_7": "mot87jsnxcixhg4pfr"
COMMENT_TO_DB_ID = {
    # "comment_del_bot": "id_en_db_data",
}


def normalize_name(s: str) -> str:
    """
    Colapsa nombres de estrategia a una firma de dígitos comparable.

    La clave es NO quitar los números de variante — SQX los escribe como (2)
    y MT5 los codifica como _2 dentro del nombre. Al quitar solo los separadores
    ambos formatos producen la misma secuencia de dígitos:

      MT5 : Strategy_3_1_15_2_Improved_2_1    → strategy31152improved21
      SQX : Strategy 3.1.15(2) - Improved 2.1.6 → strategy31152improved216

    El suffix que falta en MT5 (truncación a 31 chars) se resuelve con prefix matching.
    """
    return re.sub(r'[^a-z0-9]', '', s.lower())

# Si el comment está vacío, fallback al magic number como string
def get_bot_key(trade):
    comment = trade.get("comment", "").strip()
    if comment:
        return comment
    magic = trade.get("magic", "")
    return f"magic_{magic}" if magic else "unknown"


def parse_csv(csv_path):
    trades = []
    try:
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row.get("account"):
                    continue
                try:
                    trade = {
                        "account":     row.get("account", ""),
                        "magic":       row.get("magic", "0"),
                        "symbol":      row.get("symbol", ""),
                        "type":        row.get("type", ""),       # BUY / SELL
                        "open_time":   row.get("open_time", ""),
                        "close_time":  row.get("close_time", ""),
                        "lots":        float(row.get("lots", 0) or 0),
                        "open_price":  float(row.get("open_price", 0) or 0),
                        "close_price": float(row.get("close_price", 0) or 0),
                        "sl":          float(row.get("sl", 0) or 0),
                        "tp":          float(row.get("tp", 0) or 0),
                        "profit":      float(row.get("profit", 0) or 0),
                        "commission":  float(row.get("commission", 0) or 0),
                        "swap":        float(row.get("swap", 0) or 0),
                        "comment":     row.get("comment", ""),
                    }
                    trades.append(trade)
                except (ValueError, KeyError) as e:
                    print(f"  ⚠ Trade ignorado ({csv_path}): {e}")
    except FileNotFoundError:
        print(f"  ✗ Archivo no encontrado: {csv_path}")
    except Exception as e:
        print(f"  ✗ Error al leer {csv_path}: {e}")
    return trades


INITIAL_EQUITY = 10000.0  # equity base para calcular gain% y balance (igual que dashboard)


def calculate_metrics(trades):
    if not trades:
        return None

    total = len(trades)
    winners = [t for t in trades if t["profit"] > 0]
    losers  = [t for t in trades if t["profit"] < 0]

    total_profit  = sum(t["profit"] + t["commission"] + t["swap"] for t in trades)
    gross_profit  = sum(t["profit"] for t in winners)
    gross_loss    = abs(sum(t["profit"] for t in losers))

    pf = (gross_profit / gross_loss) if gross_loss > 0 else (999.99 if gross_profit > 0 else 0)
    wr = (len(winners) / total * 100) if total > 0 else 0

    avg_win  = (gross_profit / len(winners)) if winners else 0
    avg_loss = (gross_loss   / len(losers))  if losers  else 0

    # Equity curve, max drawdown y tradeList para dashboard
    running = 0.0
    peak    = 0.0
    max_dd  = 0.0
    trade_list = []

    sorted_trades = sorted(trades, key=lambda t: t["close_time"])
    for t in sorted_trades:
        net = t["profit"] + t["commission"] + t["swap"]
        running += net
        if running > peak:
            peak = running
        dd = (peak - running) / peak * 100 if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
        trade_list.append({
            "openDate":   t["open_time"],
            "closeDate":  t["close_time"],
            "symbol":     t["symbol"],
            "action":     "Buy" if t["type"].upper() == "BUY" else "Sell",
            "lots":       t["lots"],
            "openPrice":  t["open_price"],
            "closePrice": t["close_price"],
            "pips":       None,
            "netProfit":  round(net, 2),
            "gainPct":    round(net / INITIAL_EQUITY * 100, 4),
            "cumProfit":  round(running, 2),
        })

    from collections import Counter
    symbol_counts = Counter(t["symbol"] for t in trades)
    primary_symbol = symbol_counts.most_common(1)[0][0] if symbol_counts else "UNKNOWN"

    return {
        "symbol":        primary_symbol,
        "total_profit":  round(total_profit, 2),
        "myfxbookData": {
            "pf":          round(pf, 2),
            "ddPct":       round(max_dd, 2),
            "winRate":     round(wr, 2),
            "gain":        round(total_profit / INITIAL_EQUITY * 100, 2),
            "trades":      total,
            "balance":     round(INITIAL_EQUITY + total_profit, 2),
            "sharpe":      None,
            "zProb":       None,
            "avgWinUsd":   round(avg_win, 2),
            "avgLossUsd":  round(avg_loss, 2),
            "totalProfit": round(total_profit, 2),
            "tradeList":   trade_list,
        },
    }


def build_output(bots_by_key):
    result = []
    for key, trades in bots_by_key.items():
        metrics = calculate_metrics(trades)
        if not metrics:
            continue

        # Tomar magic del primer trade (pueden variar si el bot cambió de magic)
        magic_sample = trades[0].get("magic", "0")

        result.append({
            "id":           COMMENT_TO_DB_ID.get(key, ""),
            "comment":      key,
            "magic":        magic_sample,
            "symbol":       metrics["symbol"],
            "myfxbookData": metrics["myfxbookData"],
        })
    return result


def merge_with_db(parsed_bots, db_path):
    """
    Inyecta el bloque 'myfxbook' en db_data.json.

    Orden de matching por bot:
      1. COMMENT_TO_DB_ID explícito (override manual)
      2. Normalización automática: normalize_name(comment) == normalize_name(name)
         Cubre: Strategy_2_7_1_9_Improved_1_1_7  ←→  Strategy 2.7.19(1) - Improved 1.1.7
      3. Fallback: magic number
    """
    try:
        with open(db_path, "r", encoding="utf-8-sig") as f:
            db = json.load(f)
    except Exception as e:
        print(f"  ✗ No se pudo leer {db_path}: {e}")
        return parsed_bots

    db_list = db if isinstance(db, list) else db.get("bots", [])

    # Índices
    db_by_id         = {b["id"]: b for b in db_list if b.get("id")}
    db_by_magic      = {str(b.get("magic", "")): b for b in db_list if b.get("magic")}
    db_by_normalized = {}
    for b in db_list:
        name = b.get("name", "")
        if name:
            key_norm = normalize_name(name)
            # Guardar el más largo en caso de colisión (más específico)
            if key_norm not in db_by_normalized or len(name) > len(db_by_normalized[key_norm].get("name", "")):
                db_by_normalized[key_norm] = b

    matched   = 0
    unmatched = []

    for bot in parsed_bots:
        comment      = bot["comment"]
        magic        = str(bot["magic"])
        comment_norm = normalize_name(comment)
        db_bot       = None

        # 1. Override manual
        if comment in COMMENT_TO_DB_ID:
            db_bot = db_by_id.get(COMMENT_TO_DB_ID[comment])
            if db_bot:
                print(f"  OK [manual] '{comment}' → '{db_bot.get('name', '?')}'")

        # 2. Normalización automática — coincidencia exacta
        if not db_bot:
            db_bot = db_by_normalized.get(comment_norm)
            if db_bot:
                print(f"  OK [auto]   '{comment}' → '{db_bot.get('name', '?')}'")

        # 2b. Prefijo — cubre truncación de MT5 (límite 31 chars)
        #     El comment normalizado es prefijo del nombre normalizado
        if not db_bot and len(comment_norm) >= 15:
            for norm_key, candidate in db_by_normalized.items():
                if norm_key.startswith(comment_norm):
                    db_bot = candidate
                    print(f"  OK [prefix] '{comment}' → '{db_bot.get('name', '?')}'")
                    break

        # 3. Fallback magic
        if not db_bot and magic not in ("0", ""):
            db_bot = db_by_magic.get(magic)
            if db_bot:
                print(f"  OK [magic]  '{comment}' (magic={magic}) → '{db_bot.get('name', '?')}'")

        if db_bot:
            db_bot["myfxbookData"] = bot["myfxbookData"]
            matched += 1
        else:
            unmatched.append(comment)
            db_list.append({
                "id":           f"fed26_{comment}",
                "name":         comment,
                "symbol":       bot["symbol"],
                "source":       "fed26_csv",
                "myfxbookData": bot["myfxbookData"],
            })
            print(f"  + [nuevo]  '{comment}' → sin match SQX, agregado como entrada nueva")

    print(f"\n  Total: {matched} mergeados con SQX, {len(unmatched)} sin match")
    if unmatched:
        print(f"\n  Normalizaciones sin match:")
        for c in unmatched:
            print(f"    '{c}' → normalize: '{normalize_name(c)}'")
        print(f"\n  → Si querés forzar el match, agregá la entrada en COMMENT_TO_DB_ID")

    return db_list if isinstance(db, list) else {**db, "bots": db_list}


def main():
    ap = argparse.ArgumentParser(description="FED26 Trade Parser — CSV MT5 → dashboard JSON")
    ap.add_argument("--input",    "-i", required=True,  nargs="+", help="CSV(s) de TradeCapture (soporta glob: fed26_trades_*.csv)")
    ap.add_argument("--output",   "-o", required=False,            help="Archivo JSON de salida")
    ap.add_argument("--merge-db", "-m",                            help="db_data.json para mergear SQX data")
    ap.add_argument("--dry-run",        action="store_true",       help="Mostrar qué haría sin guardar nada")
    args = ap.parse_args()

    print("=" * 60)
    print("FED26 Trade Parser v2")
    print("=" * 60)

    # Expandir globs manualmente (útil en Windows donde shell no lo hace)
    csv_files = []
    for pattern in args.input:
        expanded = glob.glob(pattern)
        csv_files.extend(expanded if expanded else [pattern])

    if not csv_files:
        print("✗ No se encontraron archivos CSV")
        sys.exit(1)

    # --- Leer todos los CSV ---
    all_trades = []
    for f in csv_files:
        trades = parse_csv(f)
        print(f"  {f}: {len(trades)} trades")
        all_trades.extend(trades)

    print(f"\nTotal trades: {len(all_trades)}")

    # --- Agrupar por comment (o magic si comment vacío) ---
    bots = defaultdict(list)
    for t in all_trades:
        bots[get_bot_key(t)].append(t)

    print(f"Bots detectados ({len(bots)}):")
    for key, trades in sorted(bots.items(), key=lambda x: -len(x[1])):
        sample_symbol = trades[0]["symbol"] if trades else "?"
        print(f"  '{key}': {len(trades)} trades  [{sample_symbol}]")

    # --- Calcular métricas ---
    parsed_bots = build_output(bots)

    if args.dry_run:
        print("\n[DRY RUN — normalizaciones para verificar matching]")
        for bot in parsed_bots:
            c = bot["comment"]
            print(f"  '{c}'")
            print(f"    -> normalizado: '{normalize_name(c)}'")
        print("\nNo se guardó nada.")
        return

    if not args.output:
        print("\n✗ Indicá --output para guardar el resultado")
        sys.exit(1)

    # --- Mergear con db_data si se indicó ---
    if args.merge_db and Path(args.merge_db).exists():
        print(f"\nMergeando con: {args.merge_db}")
        final = merge_with_db(parsed_bots, args.merge_db)
        output_path = args.merge_db  # sobreescribe db_data.json directamente
        if args.output != args.merge_db:
            output_path = args.output  # o guarda en destino separado
    else:
        final = parsed_bots
        output_path = args.output

    # --- Guardar ---
    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final, f, indent=2, ensure_ascii=False)
        print(f"\n✔ Guardado: {output_path}")
    except Exception as e:
        print(f"\n✗ Error al guardar: {e}")
        sys.exit(1)

    print("=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
