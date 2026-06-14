#!/usr/bin/env python3
"""
Genera JSON de sucesion mensual por par (28 archivos) desde los MDs de analisis.
3 formatos de MD:
  A: EURUSD — resumen ejecutivo + tablas HIGH/CLOSE separadas (checkmarks + SÍ/NO)
  B: 22 pares — tabla H+C combinada con ✅/❌, stats "Frecuencia High/Close" en lineas
  C: 5 pares (AUDUSD, GBPJPY, USDCAD, USDCHF, USDJPY) — tabla con ✓/✗, stat linea unica
"""
import os, re, json, sys

MD_DIR   = r"C:\Users\Fede\Desktop\claude code\estacionalidad"
JSON_SRC = r"C:\Users\Fede\Desktop\claude code\Arquitectura Sistemica\seasonality_data.json"
OUT_DIR  = r"C:\Users\Fede\Desktop\claude code\Arquitectura Sistemica\sucesion"

MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
MONTH_FULL = {
    "Ene":"Enero","Feb":"Febrero","Mar":"Marzo","Abr":"Abril",
    "May":"Mayo","Jun":"Junio","Jul":"Julio","Ago":"Agosto",
    "Sep":"Septiembre","Oct":"Octubre","Nov":"Noviembre","Dic":"Diciembre",
}
FULL_TO_ABBR = {v: k for k, v in MONTH_FULL.items()}
TRANSITIONS_ORDER = [
    ("Ene","Feb"),("Feb","Mar"),("Mar","Abr"),("Abr","May"),
    ("May","Jun"),("Jun","Jul"),("Jul","Ago"),("Ago","Sep"),
    ("Sep","Oct"),("Oct","Nov"),("Nov","Dic"),
]
YEARS = list(range(2015, 2026))

os.makedirs(OUT_DIR, exist_ok=True)

# ── Cargar avg ────────────────────────────────────────────────
with open(JSON_SRC, encoding="utf-8") as f:
    sd = json.load(f)
avg_by_pair = {}
for section in ["forex", "indices", "commodities"]:
    for pair, data in sd.get(section, {}).items():
        avg_by_pair[pair] = data.get("avg") or []

# ── Helpers ───────────────────────────────────────────────────
def tparts(line):
    parts = [p.strip() for p in line.split("|")]
    return [p for p in parts if p]

def bool_cell(cell):
    """True si es SÍ/✅/✓, False si es NO/❌/✗, None si ambiguo."""
    if any(x in cell for x in ("✅", "SÍ", " SI", "✓", "✓", "✔")):
        return True
    if any(x in cell for x in ("❌", " NO", "✗", "✗", "✘")):
        return False
    return None

def parse_fraction(cell):
    """'5/11 — 45%' o '5/11 = 45%' -> (5, 45)"""
    cell = cell.replace("*","").strip()
    m = re.search(r"(\d+)/\d+\s*[=—–\-]+\s*(\d+)%", cell)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None

def abbr_from_full(name):
    """'Febrero' -> 'Feb', already-abbr 'Feb' -> 'Feb'"""
    name = name.strip()
    if name in MONTHS_ES:
        return name
    return FULL_TO_ABBR.get(name)

def detect_format(text):
    if "### HIGH:" in text or "### HIGH " in text:
        return "A"
    if any(x in text for x in ("✓", "✓", "✔")) or \
       any(x in text for x in ("✗", "✗", "✘")):
        return "C"
    return "B"

# ── Seasonality helpers ───────────────────────────────────────
def parse_season_vertical(lines, pair):
    """Formato A/B-old: tabla vertical | Mes | Pos% | Cat |"""
    seasonality = []
    avg_list = avg_by_pair.get(pair, [])
    in_table = False
    for line in lines:
        if re.search(r"Seasonality.*Referencia completa|Seasonality de referencia", line, re.I):
            in_table = True
            continue
        if not in_table:
            continue
        if not line.startswith("|"):
            if seasonality:
                break
            continue
        parts = tparts(line)
        if not parts:
            continue
        month = parts[0].replace("*","").strip()
        if month not in MONTHS_ES:
            continue
        pos_str = parts[1].replace("%","").replace("*","").strip() if len(parts) > 1 else ""
        try:
            pos = int(pos_str)
        except ValueError:
            pos = None
        idx = MONTHS_ES.index(month)
        avg = avg_list[idx] if avg_list and idx < len(avg_list) else None
        seasonality.append({"month": month, "pos": pos, "avg": avg})
    return seasonality

def parse_season_horizontal(lines, pair):
    """Formato B/C: tabla horizontal con Pos% row."""
    avg_list = avg_by_pair.get(pair, [])
    # Buscar fila header (Mes | Ene | Feb | ...) y fila Pos%
    header_months = None
    pos_row = None
    for i, line in enumerate(lines):
        if not line.startswith("|"):
            continue
        parts = tparts(line)
        if not parts:
            continue
        # Fila de meses: primera celda es "Mes" o "Ene" (primer mes)
        if parts[0] in ("Mes", "Ene") or (len(parts) >= 12 and parts[0] == "Ene"):
            # Puede ser header con "Mes" primero o directo con meses
            if parts[0] == "Mes":
                header_months = parts[1:]  # skip "Mes"
            else:
                header_months = parts      # meses directamente
            # Confirmar que son meses
            if all(m in MONTHS_ES for m in header_months[:12]):
                # Buscar la fila Pos% en las siguientes lineas
                for j in range(i+1, min(i+5, len(lines))):
                    p2 = tparts(lines[j])
                    if not p2:
                        continue
                    if p2[0].replace("*","").strip() == "Pos%":
                        pos_row = p2[1:]  # skip "Pos%"
                        break
                    elif "%" in p2[0] or (len(p2) >= 12 and "%" in p2[1]):
                        # Fila con porcentajes directamente (sin prefijo "Pos%")
                        pos_row = p2
                        break
                if pos_row:
                    break
    if header_months is None or pos_row is None:
        return []
    seasonality = []
    for idx, month in enumerate(header_months[:12]):
        if month not in MONTHS_ES:
            continue
        pos_str = pos_row[idx].replace("%","").replace("*","").strip() if idx < len(pos_row) else ""
        try:
            pos = int(pos_str)
        except ValueError:
            pos = None
        midx = MONTHS_ES.index(month)
        avg = avg_list[midx] if avg_list and midx < len(avg_list) else None
        seasonality.append({"month": month, "pos": pos, "avg": avg})
    return seasonality

# ── Parseo por formato ────────────────────────────────────────
def parse_format_A(lines, pair):
    """EURUSD: resumen ejecutivo + HIGH/CLOSE separados."""
    errors = []

    # Seasonality (vertical o buscar "Referencia completa")
    seasonality = parse_season_vertical(lines, pair)
    if len(seasonality) < 12:
        errors.append(f"seasonality incompleta A: {len(seasonality)}/12")

    # Summary table
    summary = {}
    in_sum = False
    for line in lines:
        if re.search(r"Resumen ejecutivo.*transiciones", line, re.I):
            in_sum = True
            continue
        if not in_sum:
            continue
        if not line.startswith("|"):
            if summary:
                break
            continue
        parts = tparts(line)
        if len(parts) < 4:
            continue
        tc = parts[0].replace("*","").strip()
        m = re.search(
            r"(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)"
            r"\s*.{0,5}\s*"
            r"(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)", tc)
        if not m:
            continue
        frm, to = m.group(1), m.group(2)
        hc, hp = parse_fraction(parts[1])
        cc, cp = parse_fraction(parts[2])
        dp_m = re.search(r"\((\d+)%\)", parts[3])
        dp = int(dp_m.group(1)) if dp_m else None
        summary[(frm, to)] = {"h_count":hc,"h_pct":hp,"c_count":cc,"c_pct":cp,
                               "dest_pos":dp,"dest_cat":parts[3].strip()}

    # Per-year (HIGH/CLOSE separados)
    trans_starts = {}
    for i, line in enumerate(lines):
        m3 = re.search(r"##\s+TRANSICI[OÓ]N\s+(\d+)", line, re.I)
        if m3:
            trans_starts[int(m3.group(1))] = i
    sorted_ns = sorted(trans_starts)
    trans_end = {n: trans_starts[sorted_ns[i+1]] if i+1 < len(sorted_ns) else len(lines)
                 for i, n in enumerate(sorted_ns)}

    transitions = []
    for t_idx, (frm, to) in enumerate(TRANSITIONS_ORDER, 1):
        summ = summary.get((frm, to), {})
        start = trans_starts.get(t_idx)
        h_yrs, c_yrs = {}, {}
        if start is not None:
            section = lines[start : trans_end.get(t_idx, len(lines))]
            in_h = in_c = False
            res_col = None
            for line in section:
                if re.search(r"###\s*HIGH", line, re.I):
                    in_h, in_c, res_col = True, False, None; continue
                if re.search(r"###\s*CLOSE", line, re.I):
                    in_h, in_c, res_col = False, True, None; continue
                if not (in_h or in_c) or not line.startswith("|"):
                    continue
                parts = tparts(line)
                if not parts:
                    continue
                first = parts[0].replace("*","").strip()
                if first.startswith("Año") or first == "Year":
                    res_col = next((k for k, p in enumerate(parts) if ">" in p), None)
                    continue
                if "Stat" in first:
                    continue
                ym = re.match(r"\*?\*?(\d{4})\*?\*?", first)
                if ym and res_col is not None and res_col < len(parts):
                    yr = int(ym.group(1))
                    if 2015 <= yr <= 2025:
                        val = bool_cell(parts[res_col])
                        (h_yrs if in_h else c_yrs)[yr] = val
        else:
            errors.append(f"No section TRANSICION {t_idx} ({frm}->{to})")

        if len(h_yrs) < 11: errors.append(f"T{t_idx} h_yrs={len(h_yrs)}/11")
        if len(c_yrs) < 11: errors.append(f"T{t_idx} c_yrs={len(c_yrs)}/11")

        hp = summ.get("h_pct"); cp = summ.get("c_pct"); dp = summ.get("dest_pos")
        triple = (hp is not None and cp is not None and dp is not None and hp == cp == dp)
        transitions.append({
            "from": frm, "to": to,
            "h_count": summ.get("h_count"), "h_pct": hp,
            "c_count": summ.get("c_count"), "c_pct": cp,
            "dest_pos": dp, "dest_cat": summ.get("dest_cat"),
            "triple": triple,
            "years": [{"year": yr, "h": h_yrs.get(yr), "c": c_yrs.get(yr)} for yr in YEARS],
        })
    return seasonality, transitions, errors


def parse_format_B(lines, pair):
    """22 pares: tabla H+C combinada (checkmarks ✅/❌), stats 'Frecuencia High/Close'."""
    errors = []
    seasonality = parse_season_horizontal(lines, pair)
    if len(seasonality) < 12:
        errors.append(f"seasonality incompleta B: {len(seasonality)}/12")

    # Encontrar secciones de transicion por "## Transicion N: ..."
    trans_starts = {}
    for i, line in enumerate(lines):
        m = re.search(r"##\s+Transici[oó]n\s+(\d+)\s*:", line, re.I)
        if m:
            trans_starts[int(m.group(1))] = i
    sorted_ns = sorted(trans_starts)
    trans_end = {n: trans_starts[sorted_ns[i+1]] if i+1 < len(sorted_ns) else len(lines)
                 for i, n in enumerate(sorted_ns)}

    transitions = []
    for t_idx, (frm, to) in enumerate(TRANSITIONS_ORDER, 1):
        start = trans_starts.get(t_idx)
        h_yrs, c_yrs = {}, {}
        h_count = h_pct = c_count = c_pct = dest_pos = dest_cat = None

        if start is not None:
            section = lines[start : trans_end.get(t_idx, len(lines))]
            h_col = c_col = None
            in_table = False

            for line in section:
                # Extraer stats de texto
                mh = re.search(r"Frecuencia High.*?(\d+)/\d+\s*=\s*\*?\*?(\d+)%", line)
                if mh:
                    h_count, h_pct = int(mh.group(1)), int(mh.group(2))
                mc = re.search(r"Frecuencia Close.*?(\d+)/\d+\s*=\s*\*?\*?(\d+)%", line)
                if mc:
                    c_count, c_pct = int(mc.group(1)), int(mc.group(2))
                ms = re.search(r"Seasonality\s+\w+\s+\(Pos%\).*?(\d+)%\s*[—–\-]\s*(.+)", line)
                if ms:
                    dest_pos = int(ms.group(1))
                    cat_name = ms.group(2).strip().rstrip("*").strip()
                    dest_cat = f"{to}: {cat_name} ({dest_pos}%)"

                if not line.startswith("|"):
                    continue
                parts = tparts(line)
                if not parts:
                    continue
                first = parts[0].replace("*","").strip()

                # Header row
                if first.startswith("Año") or first == "Year":
                    h_col = c_col = None
                    for k, p in enumerate(parts):
                        if re.match(r"H[\s:↑>]", p) or (p.startswith("H") and (">" in p or ":" in p or "↑" in p)):
                            h_col = k
                        if re.match(r"C[\s:↑>]", p) or (p.startswith("C") and (">" in p or ":" in p or "↑" in p)):
                            if k != h_col:
                                c_col = k
                    in_table = True
                    continue

                if not in_table:
                    continue
                ym = re.match(r"\*?\*?(\d{4})\*?\*?", first)
                if ym:
                    yr = int(ym.group(1))
                    if 2015 <= yr <= 2025:
                        if h_col is not None and h_col < len(parts):
                            h_yrs[yr] = bool_cell(parts[h_col])
                        if c_col is not None and c_col < len(parts):
                            c_yrs[yr] = bool_cell(parts[c_col])
        else:
            errors.append(f"No section Transicion {t_idx} ({frm}->{to})")

        if len(h_yrs) < 11: errors.append(f"T{t_idx} h_yrs={len(h_yrs)}/11")
        if len(c_yrs) < 11: errors.append(f"T{t_idx} c_yrs={len(c_yrs)}/11")

        hp = h_pct; cp = c_pct; dp = dest_pos
        triple = (hp is not None and cp is not None and dp is not None and hp == cp == dp)
        transitions.append({
            "from": frm, "to": to,
            "h_count": h_count, "h_pct": hp,
            "c_count": c_count, "c_pct": cp,
            "dest_pos": dp, "dest_cat": dest_cat,
            "triple": triple,
            "years": [{"year": yr, "h": h_yrs.get(yr), "c": c_yrs.get(yr)} for yr in YEARS],
        })
    return seasonality, transitions, errors


def parse_format_C(lines, pair):
    """5 pares (AUDUSD, GBPJPY, USDCAD, USDCHF, USDJPY): tabla ✓/✗, stat linea unica."""
    errors = []

    # Seasonality: fila unica sin "Mes" prefix
    # Buscar tabla con 12 celdas de porcentaje
    seasonality = []
    avg_list = avg_by_pair.get(pair, [])
    header_months = None
    for i, line in enumerate(lines):
        if not line.startswith("|"):
            continue
        parts = tparts(line)
        # Fila de meses (todas son abreviaturas de 3 letras en MONTHS_ES)
        if len(parts) >= 12 and all(p in MONTHS_ES for p in parts[:12]):
            header_months = parts[:12]
            # Siguiente fila no-separador tiene los porcentajes
            for j in range(i+1, min(i+5, len(lines))):
                if lines[j].startswith("|---|"):
                    continue
                p2 = tparts(lines[j])
                if p2 and "%" in " ".join(p2[:12]):
                    for idx, month in enumerate(header_months):
                        ps = p2[idx].replace("%","").replace("*","").strip() if idx < len(p2) else ""
                        try:
                            pos = int(ps)
                        except:
                            pos = None
                        midx = MONTHS_ES.index(month)
                        avg = avg_list[midx] if avg_list and midx < len(avg_list) else None
                        seasonality.append({"month": month, "pos": pos, "avg": avg})
                    break
            if seasonality:
                break

    if len(seasonality) < 12:
        errors.append(f"seasonality incompleta C: {len(seasonality)}/12")

    # Secciones de transicion: ### T1: Mes → Mes o ### T1: Mes → Mes
    trans_starts = {}
    for i, line in enumerate(lines):
        m = re.search(r"###\s*T(\d+)\s*:", line, re.I)
        if m:
            trans_starts[int(m.group(1))] = i
    sorted_ns = sorted(trans_starts)
    trans_end = {n: trans_starts[sorted_ns[i+1]] if i+1 < len(sorted_ns) else len(lines)
                 for i, n in enumerate(sorted_ns)}

    transitions = []
    for t_idx, (frm, to) in enumerate(TRANSITIONS_ORDER, 1):
        start = trans_starts.get(t_idx)
        h_yrs, c_yrs = {}, {}
        h_count = h_pct = c_count = c_pct = dest_pos = dest_cat = None

        if start is not None:
            section = lines[start : trans_end.get(t_idx, len(lines))]
            h_col = c_col = None
            in_table = False

            for line in section:
                # Stat linea unica: **H: N/11 = N% (Cat) | C: N/11 = N% (Cat) | Pos% Mon = N%**
                ms = re.search(
                    r"H:\s*(\d+)/\d+\s*=\s*(\d+)%.*?C:\s*(\d+)/\d+\s*=\s*(\d+)%.*?Pos%\s*\w+\s*=\s*(\d+)%",
                    line)
                if ms:
                    h_count, h_pct = int(ms.group(1)), int(ms.group(2))
                    c_count, c_pct = int(ms.group(3)), int(ms.group(4))
                    dest_pos = int(ms.group(5))
                    # Extraer categoria del C
                    cat_m = re.search(r"C:\s*\d+/\d+\s*=\s*\d+%\s*\(([^)]+)\)", line)
                    cat_name = cat_m.group(1).strip() if cat_m else ""
                    dest_cat = f"{to}: {cat_name} ({dest_pos}%)" if cat_name else f"{to}: ({dest_pos}%)"

                if not line.startswith("|"):
                    continue
                parts = tparts(line)
                if not parts:
                    continue
                first = parts[0].replace("*","").strip()

                # Header row
                if first.startswith("Año") or first == "Year":
                    h_col = c_col = None
                    for k, p in enumerate(parts):
                        if re.match(r"H[↑\^!?]", p):
                            h_col = k
                        elif re.match(r"C[↑\^!?]", p):
                            c_col = k
                    # Fallback: buscar cols con ↑
                    if h_col is None:
                        for k, p in enumerate(parts):
                            if "↑" in p and "H" in p:
                                h_col = k
                            if "↑" in p and "C" in p and k != h_col:
                                c_col = k
                    in_table = True
                    continue

                if not in_table:
                    continue
                ym = re.match(r"\*?\*?(\d{4})\*?\*?", first)
                if ym:
                    yr = int(ym.group(1))
                    if 2015 <= yr <= 2025:
                        if h_col is not None and h_col < len(parts):
                            h_yrs[yr] = bool_cell(parts[h_col])
                        if c_col is not None and c_col < len(parts):
                            c_yrs[yr] = bool_cell(parts[c_col])
        else:
            errors.append(f"No section T{t_idx} ({frm}->{to})")

        if len(h_yrs) < 11: errors.append(f"T{t_idx} h_yrs={len(h_yrs)}/11")
        if len(c_yrs) < 11: errors.append(f"T{t_idx} c_yrs={len(c_yrs)}/11")

        hp = h_pct; cp = c_pct; dp = dest_pos
        triple = (hp is not None and cp is not None and dp is not None and hp == cp == dp)
        transitions.append({
            "from": frm, "to": to,
            "h_count": h_count, "h_pct": hp,
            "c_count": c_count, "c_pct": cp,
            "dest_pos": dp, "dest_cat": dest_cat,
            "triple": triple,
            "years": [{"year": yr, "h": h_yrs.get(yr), "c": c_yrs.get(yr)} for yr in YEARS],
        })
    return seasonality, transitions, errors


def parse_md(filepath, pair):
    with open(filepath, encoding="utf-8") as f:
        text = f.read()
    lines = text.split("\n")

    # Periodo
    period = "2015-2025"
    m = re.search(r"\((\d{4})[–\-](\d{4})\)", lines[0] if lines else "")
    if not m:
        m = re.search(r"\*\*Per[ií]odo:\*\*\s*(\d{4})[–\-](\d{4})", lines[1] if len(lines)>1 else "")
    if m:
        period = f"{m.group(1)}-{m.group(2)}"

    fmt = detect_format(text)

    if fmt == "A":
        seasonality, transitions, errors = parse_format_A(lines, pair)
    elif fmt == "C":
        seasonality, transitions, errors = parse_format_C(lines, pair)
    else:
        seasonality, transitions, errors = parse_format_B(lines, pair)

    # Exceptional
    exceptional = []
    for t in transitions:
        cp = t.get("c_pct")
        if cp is not None:
            if cp >= 82:
                exceptional.append({"from":t["from"],"to":t["to"],"metric":"c","value":cp,"dir":"long"})
            elif cp <= 18:
                exceptional.append({"from":t["from"],"to":t["to"],"metric":"c","value":cp,"dir":"short"})

    # Records
    vc = [(t["from"],t["to"],t["c_pct"]) for t in transitions if t.get("c_pct") is not None]
    vh = [(t["from"],t["to"],t["h_pct"]) for t in transitions if t.get("h_pct") is not None]
    records = {}
    if vc:
        records["best_c"]  = dict(zip(["from","to","value"], max(vc, key=lambda x:x[2])))
        records["worst_c"] = dict(zip(["from","to","value"], min(vc, key=lambda x:x[2])))
    if vh:
        records["best_h"]  = dict(zip(["from","to","value"], max(vh, key=lambda x:x[2])))
        records["worst_h"] = dict(zip(["from","to","value"], min(vh, key=lambda x:x[2])))

    result = {
        "pair": pair, "period": period,
        "seasonality": seasonality,
        "transitions": transitions,
        "exceptional": exceptional,
        "records": records,
    }
    return result, errors, fmt


# ── Procesar los 28 archivos ──────────────────────────────────
md_files = sorted(
    f for f in os.listdir(MD_DIR)
    if f.endswith("_Sucesion_Mensual_Completo.md") and not f.startswith("00_")
)

all_errors = {}
generated = 0

for fname in md_files:
    pair = fname.replace("_Sucesion_Mensual_Completo.md", "")
    filepath = os.path.join(MD_DIR, fname)
    try:
        result, errors, fmt = parse_md(filepath, pair)
        out_path = os.path.join(OUT_DIR, f"{pair}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        generated += 1
        status = "WARN" if errors else "OK"
        print(f"  [{status}][{fmt}] {pair}")
        if errors:
            all_errors[pair] = errors
    except Exception as e:
        print(f"  [FAIL] {pair}: {e}")
        import traceback; traceback.print_exc()
        all_errors[pair] = [str(e)]

print(f"\nGenerados: {generated}/28")

if all_errors:
    print("\n--- Problemas por par ---")
    for pair, errs in sorted(all_errors.items()):
        for e in errs:
            e_safe = e.encode("ascii", errors="replace").decode("ascii")
            print(f"  {pair}: {e_safe}")
else:
    print("Sin errores.")
