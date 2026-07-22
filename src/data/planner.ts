import type { BudgetTierKey } from "@/data/types";

/** The custom-trip planner form (bundle `Wre` shape). */
export interface PlanForm {
  destination: string;
  tripType: string;
  duration: number;
  travelers: number;
  budget: BudgetTierKey;
  travelMonth: string;
  interests: string[];
  departingFrom: string;
  accommodation: string;
  pace: string;
}

/** Bundle `Ure`: interest chips (verbatim). */
export const INTEREST_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  emoji: string;
}> = [
  { value: "history", label: "History & Culture", emoji: "🏛️" },
  { value: "nature", label: "Nature & Hiking", emoji: "🌿" },
  { value: "food", label: "Food & Wine", emoji: "🍷" },
  { value: "art", label: "Art & Architecture", emoji: "🎨" },
  { value: "beach", label: "Beaches & Water", emoji: "🏖️" },
  { value: "adventure", label: "Adventure & Sports", emoji: "🧗" },
  { value: "nightlife", label: "Nightlife & Entertainment", emoji: "🎭" },
  { value: "photography", label: "Photography & Scenery", emoji: "📸" },
  { value: "shopping", label: "Shopping & Markets", emoji: "🛍️" },
  { value: "wellness", label: "Wellness & Relaxation", emoji: "🧘" },
];

/** Bundle `Hre`: trip-type cards (verbatim). */
export const TRIP_TYPE_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    value: "road_trip",
    label: "Road Trip",
    emoji: "🚗",
    description: "Drive through scenic routes and roadside stops",
  },
  {
    value: "international",
    label: "International",
    emoji: "✈️",
    description: "Fly abroad and explore a foreign country",
  },
  {
    value: "beach",
    label: "Beach Getaway",
    emoji: "🏖️",
    description: "Sun, sand, and relaxation",
  },
  {
    value: "city",
    label: "City Break",
    emoji: "🏙️",
    description: "Urban culture, food, and nightlife",
  },
  {
    value: "adventure",
    label: "Adventure",
    emoji: "🏔️",
    description: "Hiking, outdoor activities, and exploration",
  },
  {
    value: "cruise",
    label: "Cruise",
    emoji: "🛳️",
    description: "See multiple destinations from a ship",
  },
];

/** Bundle `zre`: month names (verbatim). */
export const MONTHS: ReadonlyArray<string> = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Bundle `Wre`: default planner form (verbatim). */
export const DEFAULT_PLAN_FORM: PlanForm = {
  destination: "",
  tripType: "road_trip",
  duration: 7,
  travelers: 2,
  budget: "midrange",
  travelMonth: "September",
  interests: [],
  departingFrom: "Dallas, TX",
  accommodation: "hotel",
  pace: "moderate",
};

/**
 * Bundle `qre` lookup table: match a free-text destination to a known
 * departure/anchor city (verbatim). Keys are matched as substrings, in order.
 */
export const DESTINATION_CITY_MAP: ReadonlyArray<[string, string]> = [
  ["route 66", "Chicago, IL"],
  ["yellowstone", "Jackson, WY"],
  ["badlands", "Rapid City, SD"],
  ["italy", "Rome"],
  ["rome", "Rome"],
  ["florence", "Florence"],
  ["amalfi", "Amalfi"],
  ["scotland", "Edinburgh"],
  ["ireland", "Dublin"],
  ["pacific coast", "San Francisco, CA"],
  ["pch", "Los Angeles, CA"],
  ["gulf coast", "New Orleans, LA"],
  ["new orleans", "New Orleans, LA"],
  ["chicago", "Chicago, IL"],
  ["dallas", "Dallas, TX"],
  ["seattle", "Seattle, WA"],
  ["portland", "Portland, OR"],
  ["las vegas", "Las Vegas, NV"],
  ["denver", "Denver, CO"],
  ["nashville", "Nashville, TN"],
  ["miami", "Miami, FL"],
  ["austin", "Austin, TX"],
  ["san francisco", "San Francisco, CA"],
  ["los angeles", "Los Angeles, CA"],
  ["new york", "New York, NY"],
  ["paris", "Paris"],
  ["london", "London"],
  ["barcelona", "Barcelona"],
  ["amsterdam", "Amsterdam"],
  ["tokyo", "Tokyo"],
];

export interface RouteWaypoint {
  name: string;
  lat: number;
  lng: number;
  day: number;
  type: "start" | "stop" | "end";
}

/**
 * Bundle `aU`: per-template driving-route waypoints (verbatim). Used to seed
 * the weather-city picker on each match card.
 */
export const ROUTE_WAYPOINTS: Record<string, RouteWaypoint[]> = {
  route66: [
    { name: "Chicago, IL", lat: 41.88, lng: -87.63, day: 1, type: "start" },
    { name: "Springfield, IL", lat: 39.8, lng: -89.65, day: 1, type: "stop" },
    { name: "St. Louis, MO", lat: 38.63, lng: -90.2, day: 2, type: "stop" },
    { name: "Joplin, MO", lat: 37.08, lng: -94.51, day: 3, type: "stop" },
    { name: "Oklahoma City, OK", lat: 35.47, lng: -97.52, day: 4, type: "stop" },
    { name: "Amarillo, TX", lat: 35.22, lng: -101.83, day: 5, type: "stop" },
    { name: "Albuquerque, NM", lat: 35.08, lng: -106.65, day: 6, type: "stop" },
    { name: "Flagstaff, AZ", lat: 35.2, lng: -111.65, day: 7, type: "stop" },
    { name: "Barstow, CA", lat: 34.9, lng: -117.02, day: 8, type: "stop" },
    { name: "Santa Monica, CA", lat: 34.02, lng: -118.49, day: 9, type: "end" },
  ],
  northern_parks: [
    { name: "Chicago, IL", lat: 41.88, lng: -87.63, day: 1, type: "start" },
    { name: "Madison, WI", lat: 43.07, lng: -89.4, day: 1, type: "stop" },
    { name: "Minneapolis, MN", lat: 44.98, lng: -93.27, day: 2, type: "stop" },
    { name: "Rapid City, SD", lat: 44.08, lng: -103.23, day: 3, type: "stop" },
    { name: "Cody, WY", lat: 44.52, lng: -109.06, day: 4, type: "stop" },
    { name: "Jackson, WY", lat: 43.48, lng: -110.76, day: 5, type: "stop" },
    { name: "Salt Lake City, UT", lat: 40.76, lng: -111.89, day: 6, type: "stop" },
    { name: "Las Vegas, NV", lat: 36.17, lng: -115.14, day: 7, type: "stop" },
    { name: "Barstow, CA", lat: 34.9, lng: -117.02, day: 8, type: "stop" },
    { name: "Los Angeles, CA", lat: 34.05, lng: -118.24, day: 9, type: "end" },
  ],
  interstate: [
    { name: "Chicago, IL", lat: 41.88, lng: -87.63, day: 1, type: "start" },
    { name: "Des Moines, IA", lat: 41.59, lng: -93.62, day: 1, type: "stop" },
    { name: "Omaha, NE", lat: 41.26, lng: -95.94, day: 2, type: "stop" },
    { name: "Denver, CO", lat: 39.74, lng: -104.99, day: 3, type: "stop" },
    { name: "Grand Junction, CO", lat: 39.07, lng: -108.55, day: 4, type: "stop" },
    { name: "Salt Lake City, UT", lat: 40.76, lng: -111.89, day: 5, type: "stop" },
    { name: "Reno, NV", lat: 39.53, lng: -119.81, day: 6, type: "stop" },
    { name: "Sacramento, CA", lat: 38.58, lng: -121.49, day: 7, type: "stop" },
    { name: "San Francisco, CA", lat: 37.77, lng: -122.42, day: 8, type: "end" },
  ],
  pacific_coast: [
    { name: "Los Angeles, CA", lat: 34.05, lng: -118.24, day: 1, type: "start" },
    { name: "Santa Barbara, CA", lat: 34.42, lng: -119.7, day: 1, type: "stop" },
    { name: "San Luis Obispo, CA", lat: 35.28, lng: -120.66, day: 2, type: "stop" },
    { name: "Monterey, CA", lat: 36.6, lng: -121.9, day: 3, type: "stop" },
    { name: "San Francisco, CA", lat: 37.77, lng: -122.42, day: 4, type: "stop" },
    { name: "Crescent City, CA", lat: 41.76, lng: -124.2, day: 5, type: "stop" },
    { name: "Eugene, OR", lat: 44.05, lng: -123.09, day: 6, type: "stop" },
    { name: "Portland, OR", lat: 45.52, lng: -122.68, day: 7, type: "stop" },
    { name: "Olympia, WA", lat: 47.04, lng: -122.9, day: 8, type: "stop" },
    { name: "Seattle, WA", lat: 47.61, lng: -122.33, day: 9, type: "end" },
  ],
  gulf_coast: [
    { name: "Dallas, TX", lat: 32.78, lng: -96.8, day: 1, type: "start" },
    { name: "Houston, TX", lat: 29.76, lng: -95.37, day: 1, type: "stop" },
    { name: "New Orleans, LA", lat: 29.95, lng: -90.07, day: 2, type: "stop" },
    { name: "Mobile, AL", lat: 30.69, lng: -88.04, day: 3, type: "stop" },
    { name: "Pensacola, FL", lat: 30.42, lng: -87.22, day: 4, type: "stop" },
    { name: "Panama City, FL", lat: 30.16, lng: -85.66, day: 5, type: "stop" },
    { name: "Tallahassee, FL", lat: 30.44, lng: -84.28, day: 6, type: "stop" },
    { name: "Savannah, GA", lat: 32.08, lng: -81.1, day: 7, type: "stop" },
    { name: "Atlanta, GA", lat: 33.75, lng: -84.39, day: 8, type: "stop" },
    { name: "Dallas, TX", lat: 32.78, lng: -96.8, day: 10, type: "end" },
  ],
  italy_west_coast: [
    { name: "Genoa", lat: 44.41, lng: 8.93, day: 1, type: "start" },
    { name: "Cinque Terre", lat: 44.11, lng: 9.73, day: 2, type: "stop" },
    { name: "Florence", lat: 43.77, lng: 11.25, day: 3, type: "stop" },
    { name: "Rome", lat: 41.9, lng: 12.49, day: 5, type: "stop" },
    { name: "Naples", lat: 40.85, lng: 14.27, day: 7, type: "stop" },
    { name: "Amalfi", lat: 40.63, lng: 14.6, day: 8, type: "stop" },
    { name: "Positano", lat: 40.63, lng: 14.49, day: 9, type: "end" },
  ],
  scotland_ireland: [
    { name: "Edinburgh", lat: 55.95, lng: -3.19, day: 1, type: "start" },
    { name: "Inverness", lat: 57.48, lng: -4.22, day: 3, type: "stop" },
    { name: "Isle of Skye", lat: 57.3, lng: -6.2, day: 4, type: "stop" },
    { name: "Fort William", lat: 56.82, lng: -5.1, day: 5, type: "stop" },
    { name: "Glasgow", lat: 55.86, lng: -4.25, day: 6, type: "stop" },
    { name: "Belfast", lat: 54.6, lng: -5.93, day: 7, type: "stop" },
    { name: "Galway", lat: 53.27, lng: -9.05, day: 9, type: "stop" },
    { name: "Dublin", lat: 53.33, lng: -6.25, day: 12, type: "end" },
  ],
};
