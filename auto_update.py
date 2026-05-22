#!/usr/bin/env python3
"""
auto_update.py — Pipeline automatico: MT5 CSVs -> Dashboard GitHub
Corre diariamente via Windows Task Scheduler en el VPS de MT5.
"""

import subprocess
import sys
import json
import re
from datetime import datetime
from pathlib import Path

# Rutas MT5
CSV_TODOS  = Path(r"C:\Users\Administrador\AppData\Roaming\MetaQuotes\Terminal\AE5EA0CBFE3E190F5D0968559E55F8BE\MQL5\Files\fed26_trades_3000092859_Todos_juntos.csv")
CSV_XAU    = Path(r"C:\MetaTrader\MetaTrader 5 - 001\MQL5\Files\fed26_trades_3000097595_Solo_Xau.csv")

# Rutas dashboard
DASHBOARD  = Path(r"C:\Dashboard")
PARSER     = DASHBOARD / "fed26_parser.py"
BASE_JSON  = DASHBOARD / ".json" / "sqx_dashboard_2026-05-20.json"
INDEX_HTML = DASHBOARD / "index.html"
LOG_FILE   = DASHBOARD / "auto_update.log"

today      = datetime.now().strftime("%Y-%m-%d")
OUTPUT_JSON = DASHBOARD / ".json" / f"sqx_dashboard_{today}_merged.json"


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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


def main():
    log("=" * 50)
    log("Iniciando auto_update pipeline")

    # Paso 0 — Sincronizar repo con la última versión del dashboard (UI, etc.)
    log("Sincronizando repo con GitHub...")
    run(["git", "checkout", "dev"])
    run(["git", "pull", "origin", "dev"])
    log("Repo sincronizado OK")

    # Paso 1 — Verificar CSVs
    for csv in [CSV_TODOS, CSV_XAU]:
        if not csv.exists():
            log(f"ERROR: CSV no encontrado: {csv}")
            sys.exit(1)
    log("CSVs encontrados OK")

    # Paso 2 — Correr el parser
    log("Corriendo fed26_parser.py...")
    run([
        sys.executable, str(PARSER),
        "--input", str(CSV_TODOS), str(CSV_XAU),
        "--output", str(OUTPUT_JSON),
        "--merge-db", str(BASE_JSON),
    ])
    log(f"Parser OK -> {OUTPUT_JSON.name}")

    # Paso 3 — Inyectar JSON en index.html
    log("Inyectando JSON en index.html...")
    with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
        bots = json.load(f)
    with open(INDEX_HTML, "r", encoding="utf-8") as f:
        html = f.read()

    m = re.search(r'(<script[^>]+id="db-store"[^>]*>)(.*?)(</script>)', html, re.DOTALL)
    if not m:
        log("ERROR: No se encontro db-store en index.html")
        sys.exit(1)

    new_json = json.dumps(bots, ensure_ascii=False, separators=(',', ':'))
    new_html = html[:m.start(2)] + new_json + html[m.end(2):]
    with open(INDEX_HTML, "w", encoding="utf-8") as f:
        f.write(new_html)
    log(f"index.html actualizado ({len(bots)} bots)")

    # Paso 4 — Git commit y push
    log("Commit y push a GitHub...")
    run(["git", "checkout", "dev"])
    run(["git", "add", "index.html"])

    # Si no hay cambios git commit falla — lo manejamos
    result = subprocess.run(
        ["git", "commit", "-m", f"Auto-update datos MT5 - {today}"],
        capture_output=True, text=True, cwd=str(DASHBOARD)
    )
    if result.returncode != 0 and "nothing to commit" in result.stdout + result.stderr:
        log("Sin cambios para commitear — dashboard ya esta al dia")
        return

    run(["git", "push", "origin", "dev"])
    run(["git", "checkout", "main"])
    run(["git", "pull", "origin", "main"])
    run(["git", "merge", "dev"])
    run(["git", "push", "origin", "main"])
    run(["git", "checkout", "dev"])

    log("Push OK — dashboard actualizado en GitHub Pages")
    log("Pipeline completado OK")
    log("=" * 50)


if __name__ == "__main__":
    main()
