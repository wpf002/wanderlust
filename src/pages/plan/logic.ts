import type { Settings, Trip } from "@/data/types";
import { DESTINATION_CITY_MAP, MONTHS, type PlanForm } from "@/data/planner";

/**
 * Bundle `jre`: score every trip template against the planner form and return
 * the top 3 matches with a score > 0. Reproduced verbatim.
 *
 * Scoring:
 *  +10 exact template match (Italy→italy_west_coast, Route 66→route66,
 *      Yellowstone/parks→northern_parks) when the destination text mentions it.
 *  +3  trip-type family match (road_trip / international).
 *  +2  beach/coast intent matching a beach/coast tag.
 *  +2  duration exactly equals the template length, or +1 within 2 days.
 */
export function matchTemplates(form: PlanForm, templates: Trip[]): Trip[] {
  const haystack = (form.destination + " " + form.tripType).toLowerCase();
  const isItaly =
    haystack.includes("italy") ||
    haystack.includes("italian") ||
    haystack.includes("amalfi") ||
    haystack.includes("cinque") ||
    haystack.includes("rome") ||
    haystack.includes("florence") ||
    haystack.includes("naples");
  const isRoute66 =
    haystack.includes("route 66") ||
    haystack.includes("mother road") ||
    haystack.includes("route66");
  const isParks =
    haystack.includes("yellowstone") ||
    haystack.includes("badlands") ||
    haystack.includes("national park") ||
    haystack.includes("zion") ||
    haystack.includes("bryce");
  const wantsRoadTrip =
    form.tripType === "road_trip" ||
    haystack.includes("road trip") ||
    haystack.includes("drive");
  const wantsInternational = form.tripType === "international" || isItaly;
  const wantsBeach =
    form.tripType === "beach" ||
    haystack.includes("beach") ||
    haystack.includes("coast") ||
    haystack.includes("amalfi");

  const scored = templates.map((template) => {
    let score = 0;
    if (isItaly && template.id === "italy_west_coast") score += 10;
    if (isRoute66 && template.id === "route66") score += 10;
    if (isParks && template.id === "northern_parks") score += 10;
    if (wantsRoadTrip && template.type === "road_trip") score += 3;
    if (wantsInternational && template.type === "international") score += 3;
    if (
      wantsBeach &&
      template.tags.some(
        (tag) =>
          tag.toLowerCase().includes("beach") ||
          tag.toLowerCase().includes("coast"),
      )
    )
      score += 2;
    const dayDelta = Math.abs(template.totalDays - form.duration);
    if (dayDelta === 0) score += 2;
    else if (dayDelta <= 2) score += 1;
    return { template, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .map((s) => s.template)
    .slice(0, 3);
}

/** Bundle `$re`: derive a cost-estimation `Settings` object from the form. */
export function planToSettings(form: PlanForm): Settings {
  return {
    budget: form.budget,
    travelers: form.travelers,
    mpg: 28,
    gasPrice: 3.85,
    flightCost: 1000,
    departingCity: form.departingFrom,
  };
}

/**
 * Bundle `Gre`: convert a travel-month name to an ISO date (the 15th of that
 * month, this year — or next year if the month has already passed). Falls back
 * to today when the month name is unrecognized.
 */
export function forecastDateForMonth(month: string): string {
  const monthIndex = MONTHS.findIndex(
    (m) => m.toLowerCase() === month.toLowerCase(),
  );
  if (monthIndex === -1) return new Date().toISOString().split("T")[0];
  const now = new Date();
  let year = now.getFullYear();
  if (monthIndex < now.getMonth()) year += 1;
  return new Date(year, monthIndex, 15).toISOString().split("T")[0];
}

/** Bundle `qre`: map a free-text destination to a known city, or null. */
export function guessDestinationCity(destination: string): string | null {
  const text = destination.toLowerCase();
  for (const [key, city] of DESTINATION_CITY_MAP) {
    if (text.includes(key)) return city;
  }
  return null;
}
