#!/usr/bin/env python3
"""
upload_to_supabase.py
Sube los bots de db_data.json a la tabla 'bots' de Supabase.
Uso: python upload_to_supabase.py
"""

import json
import urllib.request
import urllib.error
import sys

SUPABASE_URL = "https://ofrbktacgwbwsgpftoky.supabase.co"
SUPABASE_KEY = "PEGAR_SERVICE_KEY_AQUI"  # sb_secret_... (no commitear)
DB_FILE      = "db_data_full.json"


def supabase_upsert(rows):
    url  = f"{SUPABASE_URL}/rest/v1/bots"
    body = json.dumps(rows).encode("utf-8")
    req  = urllib.request.Request(
        url,
        data    = body,
        method  = "POST",
        headers = {
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()}")
        raise


def main():
    print("=" * 55)
    print("Upload db_data.json a Supabase")
    print("=" * 55)

    with open(DB_FILE, "r", encoding="utf-8-sig") as f:
        bots = json.load(f)

    if not isinstance(bots, list):
        bots = bots.get("bots", [])

    print(f"Bots encontrados: {len(bots)}")

    # Convertir cada bot al formato de la tabla:
    # columna id (text) + columna data (jsonb con el resto)
    rows = []
    skipped = 0
    for bot in bots:
        bot_id = bot.get("id", "").strip()
        if not bot_id:
            skipped += 1
            continue
        data = {k: v for k, v in bot.items() if k != "id"}
        rows.append({"id": bot_id, "data": data})

    if skipped:
        print(f"  (omitidos {skipped} bots sin id)")

    print(f"Subiendo {len(rows)} bots a Supabase...", end="", flush=True)

    # Supabase acepta hasta ~500 filas por POST; dividir si es necesario
    CHUNK = 100
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i : i + CHUNK]
        supabase_upsert(chunk)
        print(f" {i + len(chunk)}", end="", flush=True)

    print()
    print("=" * 55)
    print(f"DONE — {len(rows)} bots subidos.")
    print("=" * 55)


if __name__ == "__main__":
    main()
