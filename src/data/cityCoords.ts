import coordsJson from "./cityCoords.json";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Known city coordinates for route maps and weather lookups. */
export const cityCoords = coordsJson as Record<string, LatLng>;

/** Loose lookup: exact key, else try prefix match on the city part (e.g. "Springdale, UT (Zion NP area)"). */
export function lookupCity(name: string): LatLng | undefined {
  if (cityCoords[name]) return cityCoords[name];
  const simplified = name.split("(")[0].trim();
  if (cityCoords[simplified]) return cityCoords[simplified];
  const found = Object.keys(cityCoords).find(
    (k) => simplified.startsWith(k) || k.startsWith(simplified),
  );
  return found ? cityCoords[found] : undefined;
}
