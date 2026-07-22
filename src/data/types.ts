export interface Hotel {
  name: string;
  priceRange: string;
  notes?: string;
  location?: string;
}

export interface Attraction {
  name: string;
  location: string;
  description: string;
  hours?: string;
  category?: string;
  mileMarker?: number;
  bookingUrl?: string;
}

/** A day on a US road-trip template (route66, northern_parks, pacific_coast, gulf_coast, interstate). */
export interface RoadTripDay {
  day: number;
  from: string;
  to: string;
  miles: number;
  driveHours: number;
  driveHoursNote?: string;
  overnight: string;
  hotelPriceRange: string;
  hotelPriceNote?: string;
  hotels: Hotel[];
  attractions: Attraction[];
}

/** A day on an international template (italy_west_coast, scotland_ireland). */
export interface InternationalDay {
  day: number;
  location: string;
  title?: string;
  base?: string;
  transport?: string;
  hotelPriceRange?: string;
  hotels?: Hotel[];
  activities?: Attraction[];
  attractions?: Attraction[];
  [key: string]: unknown;
}

export interface BudgetTier {
  perPersonPerDay: number;
  label: string;
  includes: string;
  breakdown?: Record<string, string>;
}

export interface Difficulty {
  driveIntensity?: number;
  physicalActivity: number;
  planningComplexity: number;
  overall: number;
}

export interface FlightEstimate {
  fromNYC?: string;
  fromChicago?: string;
  fromLA?: string;
  fromDallas?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface Trip {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  type: "road_trip" | "international" | string;
  primaryTransport: "car" | "mixed" | string;
  totalDays: number;
  countries: string[];
  currency: string;
  bestMonths: string;
  dailyBudgets: Record<"budget" | "midrange" | "premium", BudgetTier>;
  transportNotes: string;
  highlights: string[];
  tags: string[];
  difficulty: Difficulty;
  flightEstimate?: FlightEstimate;
  roadTripDays?: RoadTripDay[];
  tripDays?: InternationalDay[];
  /** True for user-authored trips (created via the trip builder). */
  isCustom?: boolean;
}

export type BudgetTierKey = "budget" | "midrange" | "premium";

/** Cost personalization settings shared across pages (matches the original app's shape). */
export interface Settings {
  budget: BudgetTierKey;
  travelers: number;
  mpg: number;
  gasPrice: number;
  flightCost: number;
  departingCity: string;
}

export const DEFAULT_SETTINGS: Settings = {
  budget: "midrange",
  travelers: 2,
  mpg: 28,
  gasPrice: 3.85,
  flightCost: 1100,
  departingCity: "Chicago, IL",
};

export const GAS_PRICE_FALLBACK = 3.85;

export interface GasPriceData {
  date: string;
  route66Avg: number;
  northernParksAvg: number;
  isLive: boolean;
}
