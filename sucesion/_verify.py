import json, os
OUT_DIR = r"C:\Users\Fede\Desktop\claude code\Arquitectura Sistemica\sucesion"

# Triple en EURUSD T3 (Mar->Abr): h=55 c=55 dest=55
with open(os.path.join(OUT_DIR, "EURUSD.json"), encoding="utf-8") as f:
    d = json.load(f)
t3 = d["transitions"][2]
print("EURUSD T3:", t3["from"], "->", t3["to"], "h=", t3["h_pct"], "c=", t3["c_pct"], "dest=", t3["dest_pos"], "triple=", t3["triple"])

# GBPNZD sin avg
with open(os.path.join(OUT_DIR, "GBPNZD.json"), encoding="utf-8") as f:
    d = json.load(f)
print("GBPNZD season[0] avg:", d["seasonality"][0])
print("GBPNZD T1 h/c/dest:", d["transitions"][0]["h_pct"], d["transitions"][0]["c_pct"], d["transitions"][0]["dest_pos"])

# Contar archivos
files = [f for f in os.listdir(OUT_DIR) if f.endswith(".json") and not f.startswith("_")]
print("JSON files:", len(files))
print(sorted(f.replace(".json","") for f in files))
