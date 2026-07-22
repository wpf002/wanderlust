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
  return "geocode:v1:" + name.trim().toLowerCase();
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
      )}&count=5&language=en&format=json`,
    );
    if (res.ok) {
      const data = (await res.json()) as { results?: GeoResult[] };
      const results = data.results ?? [];
      if (results.length > 0) {
        // If the original name carried a region hint ("Springdale, UT"), prefer a
        // result whose state/country matches it; otherwise take the top match.
        const hint = name.includes(",")
          ? name.split(",")[1].split("(")[0].trim().toLowerCase()
          : "";
        const match =
          (hint &&
            results.find(
              (r) =>
                (r.admin1 || "").toLowerCase().includes(hint) ||
                (r.country || "").toLowerCase().includes(hint) ||
                (r.country_code || "").toLowerCase() === hint,
            )) ||
          results[0];
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
