import { getCollection, type CollectionEntry } from "astro:content";
import countries from "../data/countries.json";
import parks from "../data/parks.json";
import visited from "../data/visited.json";
import site from "../data/site.json";
import categories from "../data/categories.json";

export type Trip = CollectionEntry<"trips">;
export type Park = (typeof parks)[number];
export { site, categories, parks };

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  PR: "Puerto Rico", VI: "U.S. Virgin Islands", GU: "Guam", AS: "American Samoa", MP: "Northern Mariana Islands",
};
export const FIFTY = Object.keys(STATE_NAMES).filter((s) => !["DC", "PR", "VI", "GU", "AS", "MP"].includes(s));

type Country = { name: string; iso: string; continent: string; aliases: string[] };
const COUNTRY_LIST = Object.values(countries as Record<string, Country>);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
const byKey = new Map<string, Country>();
for (const c of COUNTRY_LIST) {
  for (const k of [c.iso, c.name, ...c.aliases]) if (k) byKey.set(norm(k), c);
}

/** Resolve "Namibia", "NA", "United States", "USA"... to a country record. Throws on typos so the build catches them. */
export function country(nameOrIso: string): Country {
  const c = byKey.get(norm(nameOrIso));
  if (!c) throw new Error(`Unknown country "${nameOrIso}". Use a name like "Namibia" or a code like "NA".`);
  return c;
}

const parkByCode = new Map(parks.map((p) => [p.code, p]));
export function park(code: string): Park {
  const p = parkByCode.get(code.toUpperCase());
  if (!p) throw new Error(`Unknown park code "${code}". Codes are the four letters in nps.gov URLs, e.g. ACAD for Acadia.`);
  return p;
}

export async function getTrips(): Promise<Trip[]> {
  const all = await getCollection("trips", (t) => !t.data.draft);
  return all.sort((a, b) => b.data.start.valueOf() - a.data.start.valueOf());
}

export async function getVisited() {
  const trips = await getTrips();
  const countryIsos = new Set<string>();
  const states = new Set<string>();
  const parkCodes = new Set<string>();
  const parkTrips = new Map<string, Trip[]>();

  for (const c of visited.countries) countryIsos.add(country(c).iso);
  for (const s of visited.states) states.add(s.toUpperCase());
  for (const p of visited.parks) parkCodes.add(park(p).code);

  // Sample trips show off the templates but never count toward real totals.
  for (const t of trips.filter((t) => !t.data.sample)) {
    for (const c of t.data.countries) countryIsos.add(country(c).iso);
    for (const s of t.data.states) states.add(s.toUpperCase());
    for (const code of t.data.parks) {
      const p = park(code);
      parkCodes.add(p.code);
      parkTrips.set(p.code, [...(parkTrips.get(p.code) ?? []), t]);
    }
  }
  if (states.size) countryIsos.add("US");
  // Visiting a single-state park means visiting that state. Multi-state units (the Natchez Trace,
  // Blue Ridge Parkway) don't say which state you were in, so they don't count.
  for (const code of parkCodes) { const st = park(code).states; if (st.length === 1) states.add(st[0]); }
  for (const s of (visited as { statesNotCounted?: string[] }).statesNotCounted ?? []) states.delete(s.toUpperCase());

  const continents = new Set(
    COUNTRY_LIST.filter((c) => countryIsos.has(c.iso)).map((c) => c.continent),
  );

  return {
    trips,
    countryIsos,
    countries: COUNTRY_LIST.filter((c) => countryIsos.has(c.iso))
      .filter((c, i, arr) => arr.findIndex((x) => x.iso === c.iso) === i)
      .sort((a, b) => a.name.localeCompare(b.name)),
    continents,
    states,
    fiftyVisited: FIFTY.filter((s) => states.has(s)),
    parkCodes,
    parkTrips,
    otherNpsSites: (visited as { otherNpsSites?: { code: string; name: string }[] }).otherNpsSites ?? [],
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
const month = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Aug 2025", "Jun – Aug 2025", or "Dec 2025 – Jan 2026". */
export function tripMonths(start: Date, end?: Date) {
  if (!end) return month.format(start);
  const a = month.format(start), b = month.format(end);
  if (a === b) return a;
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} – ${b}`;
  }
  return `${a} – ${b}`;
}

/** "Aug 12 – 17, 2025" style full dates for the trip page. */
export function tripDates(start: Date, end?: Date) {
  if (!end) return day.format(start);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const m = (d: Date) => d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (sameMonth) return `${m(start)} ${start.getUTCDate()} – ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  if (sameYear) return `${m(start)} ${start.getUTCDate()} – ${m(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  return `${day.format(start)} – ${day.format(end)}`;
}

export function tripLength(start: Date, end?: Date) {
  if (!end) return null;
  const days = Math.round((end.valueOf() - start.valueOf()) / 86400000) + 1;
  return days === 1 ? "1 day" : `${days} days`;
}

/** Short place line for cards: "California, Nevada +2" or "Namibia". */
export function tripWhere(t: Trip) {
  const d = t.data;
  const parts = d.states.length
    ? d.states.map((s) => STATE_NAMES[s.toUpperCase()] ?? s)
    : d.countries.map((c) => country(c).name.replace("United States of America", "United States"));
  return parts.length > 2 ? `${parts.slice(0, 2).join(", ")} +${parts.length - 2}` : parts.join(", ");
}
