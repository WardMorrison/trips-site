// Map geometry, computed at build time. Pages get plain SVG paths: no map library ships to the browser.
import { geoAlbersUsa, geoEqualEarth, geoGraticule, geoPath, geoCentroid, geoNaturalEarth1 } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { presimplify, simplify, quantile } from "topojson-simplify";
import world110 from "world-atlas/countries-110m.json";
import world50 from "world-atlas/countries-50m.json";
import usTopoFull from "us-atlas/states-10m.json";
import countries from "../data/countries.json";

type Pt = { lat: number; lng: number };
const COUNTRY = countries as Record<string, { name: string; iso: string; continent: string }>;

const FIPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC",
  "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT",
  "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP",
  "72": "PR", "78": "VI",
};

// The 1:10m state outlines are far more detail than a 960px map can show; keep the top ~5% of points.
const usPre = presimplify(structuredClone(usTopoFull) as any);
const usTopo = simplify(usPre, quantile(usPre, 0.95));

const worldFeatures = (feature(world110 as any, (world110 as any).objects.countries) as any).features;
const world50Features = (feature(world50 as any, (world50 as any).objects.countries) as any).features;
const worldBorders = mesh(world110 as any, (world110 as any).objects.countries, (a: any, b: any) => a !== b);
const usStates = (feature(usTopo as any, (usTopo as any).objects.states) as any).features;
const usBorders = mesh(usTopo as any, (usTopo as any).objects.states, (a: any, b: any) => a !== b);

const isoOf = (f: any) => COUNTRY[f.id ?? f.properties.name]?.iso ?? null;
const round = (n: number) => Math.round(n * 10) / 10;

/** World map (Equal Earth). Visited countries are filled; small visited countries missing from
 *  the 1:110m outlines get a dot at their 1:50m centroid so they still show. */
export function worldMap(visitedIsos: Set<string>, width = 960) {
  const projection = geoEqualEarth().rotate([-10, 0]).fitWidth(width, { type: "Sphere" } as any);
  const path = geoPath(projection).digits(0);
  const height = Math.ceil(path.bounds({ type: "Sphere" } as any)[1][1]);
  const drawn = new Set<string>();
  const lands = worldFeatures
    .filter((f: any) => f.properties.name !== "Antarctica")
    .map((f: any) => {
      const iso = isoOf(f);
      if (iso) drawn.add(iso);
      return { d: path(f) ?? "", iso, name: f.properties.name, visited: !!iso && visitedIsos.has(iso) };
    });
  const extraDots = world50Features
    .filter((f: any) => { const iso = isoOf(f); return iso && visitedIsos.has(iso) && !drawn.has(iso); })
    .map((f: any) => { const [x, y] = projection(geoCentroid(f))!; return { x: round(x), y: round(y), name: f.properties.name }; });
  return {
    width, height,
    sphere: path({ type: "Sphere" } as any) ?? "",
    graticule: path(geoGraticule().step([30, 30])()) ?? "",
    lands, extraDots,
    borders: path(worldBorders) ?? "",
    project: (p: Pt) => { const xy = projection([p.lng, p.lat]); return xy ? { x: round(xy[0]), y: round(xy[1]) } : null; },
  };
}

/** United States (Albers USA, with Alaska and Hawaii insets). Territories can't be placed and come back as null. */
export function usMap(visitedStates: Set<string>, width = 960) {
  const nation = { type: "FeatureCollection", features: usStates.filter((f: any) => FIPS[f.id] && !["AS", "GU", "MP", "VI", "PR"].includes(FIPS[f.id])) };
  const projection = geoAlbersUsa().fitWidth(width, nation as any);
  const path = geoPath(projection).digits(0);
  const height = Math.ceil(path.bounds(nation as any)[1][1]) + 2;
  return {
    width, height,
    states: (nation.features as any[]).map((f) => {
      const code = FIPS[f.id];
      return { d: path(f) ?? "", code, name: f.properties.name, visited: visitedStates.has(code) };
    }),
    borders: path(usBorders) ?? "",
    project: (p: Pt) => { const xy = projection([p.lng, p.lat]); return xy ? { x: round(xy[0]), y: round(xy[1]) } : null; },
  };
}

/** A map framed on a trip's places, padded so a single point still shows its surroundings.
 *  US states are drawn as well, so a trip in California shows state lines. */
export function tripMap(places: Pt[], visitedIsos: Set<string>, width = 360) {
  const lats = places.map((p) => p.lat), lngs = places.map((p) => p.lng);
  const spanLat = Math.max(...lats) - Math.min(...lats), spanLng = Math.max(...lngs) - Math.min(...lngs);
  const padLat = Math.max(3, spanLat * 0.35), padLng = Math.max(4, spanLng * 0.35);
  const box = {
    type: "Feature",
    geometry: {
      type: "MultiPoint",
      coordinates: [
        [Math.min(...lngs) - padLng, Math.min(...lats) - padLat],
        [Math.max(...lngs) + padLng, Math.max(...lats) + padLat],
      ],
    },
  };
  const height = Math.round(width * 0.75);
  const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const projection = geoNaturalEarth1().rotate([-midLng, 0]).fitExtent([[0, 0], [width, height]], box as any);
  const path = geoPath(projection).digits(1);
  return {
    width, height,
    lands: worldFeatures.map((f: any) => {
      const iso = isoOf(f);
      return { d: path(f) ?? "", iso, name: f.properties.name, visited: !!iso && visitedIsos.has(iso) };
    }),
    borders: path(worldBorders) ?? "",
    states: path(usBorders) ?? "",
    points: spreadLabels(places.map((p) => { const xy = projection([p.lng, p.lat]); return xy ? { x: round(xy[0]), y: round(xy[1]), ly: round(xy[1]) + 4 } : null; })),
  };
}

/** Nudge label baselines apart so nearby places don't print on top of each other. */
function spreadLabels<T extends { x: number; y: number; ly: number } | null>(pts: T[]): T[] {
  const placed: { x: number; ly: number }[] = [];
  const order = pts.map((p, i) => [p, i] as const).filter(([p]) => p).sort((a, b) => a[0]!.y - b[0]!.y);
  for (const [p] of order) {
    while (placed.some((q) => Math.abs(q.ly - p!.ly) < 15 && Math.abs(q.x - p!.x) < 140)) p!.ly += 15;
    placed.push({ x: p!.x, ly: p!.ly });
  }
  return pts;
}
