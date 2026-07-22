import { lookupCity, type LatLng } from "@/data/cityCoords";

/**
 * Resolve any place name to coordinates. Order of resolution:
 *   1. the built-in ~60-city table (instant, offline)
 *   2. in-memory + localStorage cache of previous lookups
 *   3. the free Open-Meteo geocoding API (no key, CORS-enabled)
 *
 * This lets custom trips place map markers and fetch weather for arbitrary
 * cities, not just the ones baked into the built-in itineraries.
 */

const memCache = new Map<string, LatLng | null>();

/** Strip a "City, ST (note)" string down to just the place name for querying. */
function normalize(name: string): string {
  return name.split("(")[0].split(",")[0].trim();
}

function cacheKey(name: string): string {
  return "geocode:v2:" + name.trim().toLowerCase();
}

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

/**
 * Choose the best geocoding result using the region hint after the comma
 * ("Springdale, UT" → prefer Utah). US state codes match the full state name
 * EXACTLY (so "UT" doesn't loosely match "So-UT-h Dakota"); country codes match
 * `country_code`; longer names fall back to a substring match on admin1/country.
 */
function pickResult(results: GeoResult[], rawName: string): GeoResult {
  const afterComma = rawName.includes(",")
    ? rawName.split(",")[1].split("(")[0].trim()
    : "";
  if (afterComma) {
    const hint = afterComma.toLowerCase();
    const stateName = US_STATES[afterComma.toUpperCase()]?.toLowerCase();
    const match = results.find((r) => {
      const admin1 = (r.admin1 || "").toLowerCase();
      const country = (r.country || "").toLowerCase();
      const cc = (r.country_code || "").toLowerCase();
      if (stateName && admin1 === stateName) return true;
      if (hint.length === 2 && cc === hint) return true;
      if (hint.length > 3 && (admin1.includes(hint) || country.includes(hint)))
        return true;
      return false;
    });
    if (match) return match;
  }
  return results[0];
}

interface GeoResult {
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
  country_code?: string;
}

export async function geocodeCity(name: string): Promise<LatLng | null> {
  if (!name || !name.trim()) return null;

  // 1. Built-in coordinates — fast path, no network.
  const built = lookupCity(name);
  if (built) return built;

  // 2. Cache.
  const key = cacheKey(name);
  if (memCache.has(key)) return memCache.get(key) ?? null;
  try {
    const cached = localStorage.getItem(key);
    if (cached !== null) {
      const value = JSON.parse(cached) as LatLng | null;
      memCache.set(key, value);
      return value;
    }
  } catch {
    // localStorage unavailable — fall through to the network.
  }

  // 3. Open-Meteo geocoding.
  let result: LatLng | null = null;
  try {
    const query = normalize(name);
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query,
      )}&count=10&language=en&format=json`,
    );
    if (res.ok) {
      const data = (await res.json()) as { results?: GeoResult[] };
      const results = data.results ?? [];
      if (results.length > 0) {
        const match = pickResult(results, name);
        result = { lat: match.latitude, lng: match.longitude };
      }
    }
  } catch {
    result = null;
  }

  memCache.set(key, result);
  try {
    localStorage.setItem(key, JSON.stringify(result));
  } catch {
    // Ignore quota/availability errors — the in-memory cache still helps.
  }
  return result;
}
