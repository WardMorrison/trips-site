#!/usr/bin/env python3
"""Build src/data/parks.json: every unit of the National Park System with a point location.

Inputs (saved in tools/ so the build is reproducible):
  nps_boundary_centroids.json  NPS Land Resources Division boundary centroids (ArcGIS, layer 0)
  nps_api_parks.json           developer.nps.gov /parks?limit=600 (nicer names, a few newer units)

The official unit count (433 as of 2026) is set in src/data/site.json, not derived here:
the two NPS sources disagree on edge cases (parks with separate preserves, trails,
affiliated areas), so the list below is for mapping and matching, not for the total.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent / "src" / "data" / "parks.json"

# Units in the API but missing from the boundary layer that are official NPS units.
EXTRA_UNITS = {"COLT", "PARA", "NATT", "POHE", "OKCI"}
# Boundary-layer codes that duplicate another entry (Craters of the Moon's preserve is part of CRMO).
DUPLICATES = {"CRMP"}
SKIP_TYPES = {"National Trails System"}  # national historic trails are not counted as units

TYPE_SINGULAR = {
    "National Parks": "National Park", "National Monuments": "National Monument",
    "National Historic Sites": "National Historic Site", "National Historical Parks": "National Historical Park",
    "National Memorials": "National Memorial", "National Preserves": "National Preserve",
    "National Recreation Areas": "National Recreation Area", "National Battlefields": "National Battlefield",
    "National Wild & Scenic Rivers": "Wild & Scenic River", "National Seashores": "National Seashore",
    "National Military Parks": "National Military Park", "National Scenic Trails": "National Scenic Trail",
    "National Rivers": "National River", "National Battlefield Parks": "National Battlefield Park",
    "Parkways": "Parkway", "National Lakeshores": "National Lakeshore", "National Reserves": "National Reserve",
    "International Historic Sites": "International Historic Site", "Affiliated Areas": "Other",
    "National Battlefield Sites": "National Battlefield Site", "Other Designations": "Other",
}

arc = json.load(open(HERE / "nps_boundary_centroids.json"))["features"]
api = {p["parkCode"].upper(): p for p in json.load(open(HERE / "nps_api_parks.json"))["data"]}

units = {}
for f in arc:
    a = f["attributes"]
    if a["UNIT_TYPE"] in SKIP_TYPES:
        continue
    code = a["UNIT_CODE"]
    if code in DUPLICATES:
        continue
    u = units.setdefault(code, {"code": code, "name": a["UNIT_NAME"], "type": TYPE_SINGULAR.get(a["UNIT_TYPE"], "Other"),
                                "state": a["STATE"], "lat": round(f["geometry"]["y"], 4), "lng": round(f["geometry"]["x"], 4)})
    # A park and its preserve share a code; keep the park's type and point.
    if a["UNIT_TYPE"] == "National Parks":
        u.update(type="National Park", lat=round(f["geometry"]["y"], 4), lng=round(f["geometry"]["x"], 4))

for code in EXTRA_UNITS:
    p = api[code]
    units[code] = {"code": code, "name": p["fullName"], "type": p["designation"] or "Other",
                   "state": p["states"].split(",")[0], "lat": round(float(p["latitude"]), 4), "lng": round(float(p["longitude"]), 4)}

# Prefer the API's display names ("Katmai National Park & Preserve") where codes match.
for code, u in units.items():
    p = api.get(code)
    if p and p["fullName"]:
        u["name"] = p["fullName"].strip()
        if p["states"]:
            u["states"] = p["states"].split(",")
    if " National Park" in u["name"] and "Historical Park" not in u["name"] and "Military Park" not in u["name"] and "Battlefield Park" not in u["name"] and "Performing Arts" not in u["name"]:
        u["type"] = "National Park"  # e.g. New River Gorge is filed under its preserve
    u.setdefault("states", [u["state"]])
    u.pop("state", None)

rows = sorted(units.values(), key=lambda u: u["name"])
OUT.parent.mkdir(parents=True, exist_ok=True)
json.dump(rows, open(OUT, "w"), indent=0, ensure_ascii=False)
print(f"{len(rows)} units -> {OUT}")
