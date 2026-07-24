import type { Settings, Trip } from "@/data/types";
import { DESTINATION_CITY_MAP, MONTHS, type PlanForm } from "@/data/planner";

/** Place keywords that clearly identify a specific template. */
const DESTINATION_KEYWORDS: ReadonlyArray<[string, readonly string[]]> = [
  [
    "italy_west_coast",
    [
      "italy", "italian", "tuscany", "tuscan", "amalfi", "cinque terre", "cinque",
      "rome", "roman", "florence", "firenze", "naples", "napoli", "venice",
      "milan", "positano", "sorrento", "pompeii", "capri", "sicily",
    ],
  ],
  [
    "scotland_ireland",
    [
      "scotland", "scottish", "ireland", "irish", "dublin", "edinburgh",
      "highlands", "isle of skye", "skye", "belfast", "galway", "killarney",
      "celtic", "loch ness", "glencoe",
    ],
  ],
  ["route66", ["route 66", "route66", "mother road"]],
  [
    "northern_parks",
    [
      "yellowstone", "badlands", "national park", "national parks", "zion",
      "bryce", "mount rushmore", "rushmore", "grand teton", "teton",
      "black hills", "devils tower",
    ],
  ],
  [
    "pacific_coast",
    [
      "pacific coast", "pch", "big sur", "highway 1", "california coast",
      "monterey", "hearst", "redwood", "olympic", "seattle", "portland",
    ],
  ],
  [
    "gulf_coast",
    [
      "gulf coast", "gulf", "new orleans", "nola", "louisiana", "bayou",
      "cajun", "houston", "dallas", "texas", "pensacola", "panhandle",
    ],
  ],
  [
    "interstate",
    ["i-80", "i80", "i-70", "i70", "transcontinental", "cross country", "cross-country"],
  ],
  [
    "japan_highlights",
    [
      "japan", "japanese", "tokyo", "kyoto", "osaka", "hiroshima", "nara",
      "hakone", "shibuya", "shinjuku", "miyajima", "mount fuji", "fuji",
    ],
  ],
  [
    "paris_france",
    [
      "paris", "france", "french", "versailles", "montmartre", "louvre",
      "eiffel", "marais", "seine",
    ],
  ],
  [
    "portugal_coast",
    [
      "portugal", "portuguese", "lisbon", "lisboa", "porto", "oporto",
      "algarve", "sintra", "lagos", "ericeira", "madeira", "azores", "tavira",
    ],
  ],
  [
    "costa_rica",
    [
      "costa rica", "costa rican", "san jose", "arenal", "la fortuna",
      "monteverde", "manuel antonio", "santa teresa", "tamarindo",
      "nicoya", "guanacaste", "jaco",
    ],
  ],
];

/** Interest value → keywords matched against a template's tags. */
const INTEREST_TAG_KEYWORDS: Record<string, readonly string[]> = {
  history: ["history", "historic", "castles", "unesco", "culture", "celtic"],
  nature: ["nature", "wildlife", "scenery", "national parks", "hiking", "geysers", "scenic"],
  food: ["food", "wine", "cajun", "diners", "food scene"],
  art: ["art", "architecture", "unesco"],
  beach: ["beach", "beaches", "coastal", "coast"],
  adventure: ["adventure", "hiking", "sports", "epic scenery"],
  nightlife: ["pubs", "music", "nightlife", "entertainment"],
  photography: ["scenic", "scenery", "epic scenery", "coastal"],
  shopping: ["shopping", "markets", "roadside americana"],
  wellness: ["wellness", "relaxation", "beaches"],
};

/** Templates whose place keywords appear in the destination text. */
function destinationMatches(destination: string, templates: Trip[]): Trip[] {
  const text = destination.toLowerCase().trim();
  if (!text) return [];
  const ids = new Set(
    DESTINATION_KEYWORDS.filter(([, keywords]) =>
      keywords.some((k) => text.includes(k)),
    ).map(([id]) => id),
  );
  return templates.filter((t) => ids.has(t.id));
}

/** How many of the chosen interests this template's tags cover. */
function interestOverlap(form: PlanForm, template: Trip): number {
  const tags = template.tags.map((t) => t.toLowerCase());
  return form.interests.filter((interest) =>
    (INTEREST_TAG_KEYWORDS[interest] ?? []).some((keyword) =>
      tags.some((tag) => tag.includes(keyword)),
    ),
  ).length;
}

/**
 * Match trip templates against the planner form.
 *
 * Precedence:
 *  1. If the destination text names a place we have a template for, return only
 *     those — asking for Tuscany should never surface a Gulf Coast road trip.
 *  2. If they named a destination we have nothing for, return nothing rather
 *     than pretending an unrelated country is a match.
 *  3. With no destination given, filter by trip type (Road Trip / International
 *     are hard filters) and rank by interest overlap.
 *
 * Duration only breaks ties: being close to the requested length is not on its
 * own a reason to call something a match.
 */
export function matchTemplates(form: PlanForm, templates: Trip[]): Trip[] {
  const byDestination = destinationMatches(form.destination, templates);
  const askedForSomewhere = form.destination.trim().length > 0;
  if (askedForSomewhere && byDestination.length === 0) return [];

  const pool = byDestination.length > 0 ? byDestination : templates;

  // Trip type is a hard filter only when it maps onto a template family, and
  // only when the destination hasn't already pinned the answer.
  const typeFiltered =
    byDestination.length > 0
      ? pool
      : form.tripType === "road_trip"
        ? pool.filter((t) => t.type === "road_trip")
        : form.tripType === "international"
          ? pool.filter((t) => t.type === "international")
          : pool;

  const scored = typeFiltered.map((template) => {
    const isDestinationMatch = byDestination.includes(template);
    const interests = interestOverlap(form, template);
    // Relevance must come from a real signal — destination, type family, or
    // shared interests — never from duration alone.
    let relevance = 0;
    if (isDestinationMatch) relevance += 10;
    if (form.tripType === "road_trip" && template.type === "road_trip") relevance += 3;
    if (form.tripType === "international" && template.type === "international")
      relevance += 3;
    relevance += interests * 2;

    const dayDelta = Math.abs(template.totalDays - form.duration);
    const durationBonus = dayDelta === 0 ? 1 : dayDelta <= 2 ? 0.5 : 0;
    return { template, relevance, score: relevance + durationBonus };
  });

  return scored
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.score - a.score)
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
