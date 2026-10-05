# trips.wardmorrison.com

Astro site: trips grouped into carousels by category, a world and U.S. map of everywhere visited, and progress through the National Park System.

## Run it

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
```

## Add a trip

Make a folder in `src/content/trips/` named for the URL you want (`namibia-2025` becomes `/trips/namibia-2025/`). Put an `index.md` and your photos in it:

```markdown
---
title: Mushara field season
category: research            # backpacking | research | fun  (src/data/categories.json)
start: 2025-06-20
end: 2025-08-01               # optional
summary: One sentence for the card and the top of the page.
cover: ./cover.jpg
coverAlt: Describe the photo
countries: [Namibia]          # names or ISO codes; drive the world map and country count
states: []                    # two-letter US states
parks: []                     # NPS codes, e.g. [ACAD, YOSE] (in src/data/parks.json)
places:                       # points on the trip's map
  - { name: Mushara, lat: -18.9, lng: 16.6 }
gallery:
  - { src: ./01.jpg, alt: Elephants at the waterhole, caption: Optional }
links:
  - { type: instagram, url: "https://www.instagram.com/p/..." }
  - { type: facebook, url: "https://www.facebook.com/...", label: "Field update" }
draft: false                  # true hides it from the site
---

Writing goes here, in Markdown. `## Headings` make sections. Inline photos: ![alt](./02.jpg)
```

Photos are resized and converted to WebP at build time, so export full-size JPEGs (~2500 px long edge is plenty). A typo in a country, state or park code fails the build with a message saying which one.

Delete the `sample-*` folders once real trips exist. The "Sample content" banner goes away on its own.

## Places and parks

- `src/data/visited.json` holds places visited outside any trip page. Trips add their own countries, states and parks automatically. A visited park also counts its state.
- **NPS app sync:** list the app's "Visited" names in `tools/visited_from_app.txt`, one per line, and run `python3 tools/import_app_list.py`. Official units go in `parks` and count toward the 433. Trails, partnership rivers and administrative groupings go in `otherNpsSites` and are listed separately.
- `src/data/site.json` holds the official unit total (433, Congressional Research Service, Feb 2026) and the home bases. Home bases are region-level points, not addresses.
- `src/data/parks.json` is built by `tools/build_parks.py` from NPS data saved in `tools/`. `src/data/countries.json` is built by `tools/build_countries.py`.

## Deploy (Cloudflare Pages)

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `NODE_VERSION=22`
- Custom domain: `trips.wardmorrison.com`
