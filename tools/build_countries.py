#!/usr/bin/env python3
"""Build src/data/countries.json: world-atlas (Natural Earth 1:50m) country ids -> name, ISO alpha-2, continent.
Run after `npm install`. Requires: pip install pycountry pycountry-convert"""
import json
from pathlib import Path
import pycountry
import pycountry_convert as pc

ROOT = Path(__file__).resolve().parents[1]
topo = json.load(open(ROOT / "node_modules/world-atlas/countries-50m.json"))
CONT = {"AF": "Africa", "AN": "Antarctica", "AS": "Asia", "EU": "Europe", "NA": "North America", "OC": "Oceania", "SA": "South America"}
FIX = {"Kosovo": ("XK", "Europe"), "N. Cyprus": ("CY", "Asia"), "Somaliland": ("SO", "Africa"),
       "Antarctica": ("AQ", "Antarctica"), "Timor-Leste": ("TL", "Asia"), "W. Sahara": ("EH", "Africa"),
       "Fr. S. Antarctic Lands": ("TF", "Antarctica"), "Vatican": ("VA", "Europe"), "Sint Maarten": ("SX", "North America"),
       "Siachen Glacier": ("IN", "Asia"), "Ashmore and Cartier Is.": ("AU", "Oceania"), "Indian Ocean Ter.": ("AU", "Oceania"), "Pitcairn Is.": ("PN", "Oceania")}
EXTRA_ALIASES = {"US": {"United States", "USA", "America"}, "GB": {"UK", "Britain", "Great Britain", "England", "Scotland", "Wales"},
                 "KR": {"South Korea"}, "RU": {"Russia"}, "TZ": {"Tanzania"}, "CZ": {"Czech Republic"}, "VN": {"Vietnam"},
                 "BO": {"Bolivia"}, "VA": {"Vatican City", "Vatican", "Holy See"}, "CI": {"Ivory Coast"}, "MM": {"Burma"},
                 "TL": {"East Timor"}, "SZ": {"Swaziland"}, "MK": {"Macedonia"}, "CV": {"Cape Verde"},
                 "CD": {"DR Congo", "Democratic Republic of the Congo", "Congo-Kinshasa"}, "CG": {"Republic of the Congo", "Congo-Brazzaville"},
                 "KP": {"North Korea"}, "PS": {"Palestine"}, "TW": {"Taiwan"}, "AE": {"UAE"}, "NL": {"Holland"},
                 "BA": {"Bosnia", "Bosnia and Herzegovina"}, "DO": {"Dominican Republic"}, "CF": {"Central African Republic"}, "VE": {"Venezuela"}, "IR": {"Iran"}, "SY": {"Syria"}, "LA": {"Laos"}, "MD": {"Moldova"}}
out = {}
for g in topo["objects"]["countries"]["geometries"]:
    name = g["properties"]["name"]
    cid = g.get("id")
    a2, cont = None, None
    if name in FIX:
        a2, cont = FIX[name]
    else:
        c = pycountry.countries.get(numeric=cid) if cid else None
        if c:
            a2 = c.alpha_2
            try:
                cont = CONT[pc.country_alpha2_to_continent_code(a2)]
            except KeyError:
                cont = None
    key = cid or name
    aliases = set()
    c = pycountry.countries.get(alpha_2=a2) if a2 else None
    if c:
        for attr in ("name", "official_name", "common_name"):
            if getattr(c, attr, None):
                aliases.add(getattr(c, attr))
    aliases |= EXTRA_ALIASES.get(a2, set())
    aliases.discard(name)
    out[key] = {"name": name, "iso": a2, "continent": cont, "aliases": sorted(aliases)}
missing = [v["name"] for v in out.values() if not v["iso"] or not v["continent"]]
json.dump(out, open(ROOT / "src/data/countries.json", "w"), ensure_ascii=False, indent=0)
print(len(out), "countries; missing:", missing)
