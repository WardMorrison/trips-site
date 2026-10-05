#!/usr/bin/env python3
"""Turn the NPS app's "Visited" list (one name per line in tools/visited_from_app.txt)
into park codes in src/data/visited.json.

Official units go in "parks" and count toward the 433. App entries that aren't units
(national historic trails, partnership rivers, administrative groupings, international
parks) go in "otherNpsSites" and are listed separately on the parks page.

Run: python3 tools/import_app_list.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
api = json.load(open(ROOT / "tools/nps_api_parks.json"))["data"]
units = {p["code"] for p in json.load(open(ROOT / "src/data/parks.json"))}

# App entries that stand for one or more official units under different codes.
EXPANDS = {"SEKI": ["SEQU", "KICA"], "NAMA": ["MALL"]}

norm = lambda s: re.sub(r"[^a-z]", "", s.lower().replace("&", "and"))
by_name = {norm(p["fullName"]): p for p in api}

names = [l.strip() for l in open(ROOT / "tools/visited_from_app.txt") if l.strip() and not l.startswith("#")]
parks, other, unknown = [], [], []
for name in names:
    p = by_name.get(norm(name))
    if not p:
        hits = [q for k, q in by_name.items() if norm(name)[:18] in k]
        p = hits[0] if len(hits) == 1 else None
    if not p:
        unknown.append(name)
        continue
    code = p["parkCode"].upper()
    for c in EXPANDS.get(code, [code]):
        if c in units:
            parks.append(c)
        else:
            other.append((c, p["fullName"].strip()))

path = ROOT / "src/data/visited.json"
data = json.load(open(path))
data["parks"] = sorted(set(parks))
data["otherNpsSites"] = [{"code": c, "name": n} for c, n in sorted(set(other), key=lambda x: x[1])]
json.dump(data, open(path, "w"), indent=2)
print(f"{len(names)} app entries -> {len(set(parks))} official units, {len(set(other))} other NPS sites")
if unknown:
    print("Couldn't match (fix spelling or add by code):", *unknown, sep="\n  ")
    sys.exit(1)
