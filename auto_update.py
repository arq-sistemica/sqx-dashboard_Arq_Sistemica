#!/usr/bin/env python3
"""
auto_update.py — Pipeline automatico: MT5 CSVs -> Supabase
Corre diariamente via Windows Task Scheduler en el VPS de MT5.

Flujo:
  1. Verificar CSVs del TradeCapture EA
  2. Obtener bots actuales de Supabase (base para el merge)
  3. Correr fed26_parser.py (MT5 data + merge con base SQX)
  4. Subir resultado a Supabase (upsert)

Ya no modifica index.html ni hace operaciones git.
"""

import subprocess
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ── CREDENCIALES SUPABASE ──────────────────────────────────────
# En el VPS: reemplazar con la service key real (sb_secret_...)
# Este archivo NO debe commitearse con la key real adentro.
# Opcion alternativa: crear vps_secrets.py con SUPABASE_SERVICE_KEY = "sb_secret_..."
try:
    from vps_secrets import SUPABASE_SERVICE_KEY, SUPABASE_URL
except ImportError:
    SUPABASE_URL         = "https://ofrbktacgwbwsgpftoky.supabase.co"
    SUPABASE_SERVICE_KEY = "REEMPLAZAR_CON_SERVICE_KEY"   # sb_secret_...

# ── RUTAS ──────────────────────────────────────────────────────
CSV_TODOS  = Path(r"C:\Users\Administrador\AppData\Roaming\MetaQuotes\Terminal\AE5EA0CBFE3E190F5D0968559E55F8BE\MQL5\Files\fed26_trades_3000092859_Todos_juntos.csv")
CSV_XAU    = Path(r"C:\MetaTrader\MetaTrader 5 - 001\MQL5\Files\fed26_trades_3000097595_Solo_Xau.csv")

DASHBOARD  = Path(r"C:\Dashboard")
PARSER     = DASHBOARD / "fed26_parser.py"
LOG_FILE   = DASHBOARD / "auto_update.log"

today       = datetime.now().strftime("%Y-%m-%d")
TEMP_BASE   = DASHBOARD / ".json" / f"supabase_base_{today}.json"
OUTPUT_JSON = DASHBOARD / ".json" / f"sqx_dashboard_{today}_merged.json"


# ── HELPERS ────────────────────────────────────────────────────
def log(msg):
    ts   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(cmd, cwd=None):
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(cwd or DASHBOARD))
    if result.returncode != 0:
        log(f"ERROR ejecutando: {' '.join(str(c) for c in cmd)}")
        log(result.stderr[-500:] if result.stderr else "(sin stderr)")
        sys.exit(1)
    return result.stdout.strip()


def sb_headers():
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
    }


def fetch_bots_from_supabase():
    """Descarga todos los bots de Supabase y los guarda como JSON temporal."""
    url = f"{SUPABASE_URL}/rest/v1/bots?select=id,data&order=id"
    req = urllib.request.Request(url, headers=sb_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            rows = json.loads(resp.read().decode())
        # Reconstruir cada bot: id + campos del data JSONB
        bots = [{"id": row["id"], **row["data"]} for row in rows]
        TEMP_BASE.parent.mkdir(parents=True, exist_ok=True)
        with open(TEMP_BASE, "w", encoding="utf-8") as f:
            json.dump(bots, f, ensure_ascii=False)
        log(f"Bots descargados de Supabase: {len(bots)}")
        return len(bots)
    except urllib.error.HTTPError as e:
        log(f"ERROR Supabase fetch: HTTP {e.code} - {e.read().decode()[:300]}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR Supabase fetch: {e}")
        sys.exit(1)


def upload_bots_to_supabase(json_path):
    """Sube todos los bots del JSON a Supabase (upsert)."""
    with open(json_path, "r", encoding="utf-8") as f:
        bots = json.load(f)

    if not isinstance(bots, list):
        bots = bots.get("bots", [])

    rows    = [{"id": b["id"], "data": {k: v for k, v in b.items() if k != "id"}}
               for b in bots if b.get("id")]
    total   = 0
    CHUNK   = 100

    for i in range(0, len(rows), CHUNK):
        chunk = rows[i:i + CHUNK]
        body  = json.dumps(chunk).encode("utf-8")
        req   = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/bots",
            data    = body,
            method  = "POST",
            headers = {
                **sb_headers(),
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req) as resp:
                total += len(chunk)
        except urllib.error.HTTPError as e:
            log(f"ERROR Supabase upsert: HTTP {e.code} - {e.read().decode()[:300]}")
            sys.exit(1)

    log(f"Bots subidos a Supabase: {total}")
    return total


# ── PIPELINE ───────────────────────────────────────────────────
def main():
    log("=" * 50)
    log("Iniciando auto_update pipeline (Supabase)")

    # Paso 1 — Verificar CSVs
    for csv in [CSV_TODOS, CSV_XAU]:
        if not csv.exists():
            log(f"ERROR: CSV no encontrado: {csv}")
            sys.exit(1)
    log("CSVs encontrados OK")

    # Paso 2 — Obtener base actual de Supabase
    log("Descargando bots de Supabase como base...")
    fetch_bots_from_supabase()

    # Paso 3 — Correr el parser (MT5 data + merge con base Supabase)
    log("Corriendo fed26_parser.py...")
    run([
        sys.executable, str(PARSER),
        "--input",    str(CSV_TODOS), str(CSV_XAU),
        "--output",   str(OUTPUT_JSON),
        "--merge-db", str(TEMP_BASE),
    ])
    log(f"Parser OK -> {OUTPUT_JSON.name}")

    # Paso 4 — Subir resultado a Supabase
    log("Subiendo resultado a Supabase...")
    upload_bots_to_supabase(OUTPUT_JSON)

    log("Pipeline completado OK")
    log("=" * 50)


if __name__ == "__main__":
    main()
