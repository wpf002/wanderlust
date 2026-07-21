import type { Trip } from "./types";
import tripsJson from "./trips.json";

/** The 7 built-in trip templates, extracted verbatim from the original app. */
export const trips = tripsJson as unknown as Trip[];

export function getTrip(id: string): Trip | undefined {
  return trips.find((t) => t.id === id);
}
