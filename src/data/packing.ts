import type { Trip } from "@/data/types";

export interface PackingItem {
  name: string;
  essential: boolean;
  note?: string;
}

export interface PackingCategory {
  name: string;
  icon: string;
  items: PackingItem[];
}

export interface Season {
  value: string;
  label: string;
  emoji: string;
}

/** Base categories included on every trip (bundle `eae`). */
const BASE_CATEGORIES: PackingCategory[] = [
  {
    name: "Documents & Money",
    icon: "📄",
    items: [
      { name: "Passport / ID", essential: true },
      { name: "Driver's license", essential: true },
      { name: "Travel insurance docs", essential: true },
      { name: "Credit / debit cards", essential: true },
      {
        name: "Emergency cash",
        essential: true,
        note: "Small bills for tips and tolls",
      },
      { name: "Hotel confirmation printouts", essential: false },
    ],
  },
  {
    name: "Health & Safety",
    icon: "💊",
    items: [
      { name: "Prescription medications", essential: true },
      { name: "First aid kit", essential: true },
      { name: "Sunscreen SPF 30+", essential: true },
      { name: "Hand sanitizer", essential: true },
      { name: "Pain relievers (ibuprofen/acetaminophen)", essential: false },
      { name: "Allergy medication", essential: false },
      { name: "Motion sickness tablets", essential: false },
    ],
  },
  {
    name: "Tech & Power",
    icon: "🔌",
    items: [
      { name: "Phone charger", essential: true },
      { name: "Portable power bank", essential: true },
      { name: "Headphones", essential: false },
      { name: "Camera / extra memory cards", essential: false },
      {
        name: "Universal power adapter",
        essential: false,
        note: "International trips only",
      },
    ],
  },
];

/** Extra categories for road-trip templates (bundle `tae`). */
const ROAD_TRIP_CATEGORIES: PackingCategory[] = [
  {
    name: "Car Essentials",
    icon: "🚗",
    items: [
      {
        name: "Physical maps / atlas",
        essential: true,
        note: "Backup when signal is lost in rural areas",
      },
      { name: "Car phone mount", essential: true },
      { name: "Car charger / USB adapter", essential: true },
      { name: "Jumper cables", essential: true },
      {
        name: "Roadside emergency kit",
        essential: true,
        note: "Flares, reflectors, basic tools",
      },
      { name: "Spare tire + jack (check pressure)", essential: true },
      { name: "Tire pressure gauge", essential: false },
      { name: "Windshield sunshade", essential: false },
      { name: "Trash bags (keep car clean)", essential: false },
    ],
  },
  {
    name: "Comfort & Snacks",
    icon: "🍎",
    items: [
      { name: "Cooler / insulated bag", essential: false },
      { name: "Reusable water bottles", essential: true },
      {
        name: "Road trip snacks",
        essential: false,
        note: "Nuts, jerky, granola bars — skip gas station markups",
      },
      { name: "Travel pillow", essential: false },
      { name: "Blanket", essential: false },
      {
        name: "Entertainment (downloaded podcasts, playlists)",
        essential: false,
      },
    ],
  },
  {
    name: "Clothing",
    icon: "👕",
    items: [
      { name: "Comfortable driving clothes", essential: true },
      {
        name: "Layers for temperature changes",
        essential: true,
        note: "Desert nights get cold",
      },
      { name: "Walking / hiking shoes", essential: true },
      { name: "Rain jacket", essential: false },
      { name: "Sunglasses", essential: true },
      { name: "Hat", essential: false },
    ],
  },
];

/** Season add-ons appended to the Clothing category (bundle `rae` / `nae`). */
const SUMMER_CLOTHING: PackingItem[] = [
  { name: "Extra sunscreen (SPF 50+ for long drives)", essential: true },
  { name: "Cooling towel", essential: false },
  { name: "Insect repellent", essential: false },
  { name: "Lightweight breathable clothes", essential: true },
];

const WINTER_CLOTHING: PackingItem[] = [
  { name: "Warm layers / thermal base layers", essential: true },
  { name: "Ice scraper + snow brush (in car)", essential: true },
  { name: "Warm hat, gloves, scarf", essential: true },
  { name: "Heavy coat", essential: true },
  { name: "Hand warmers", essential: false },
];

/** Extra categories for international templates (bundle `aae`). */
const INTERNATIONAL_CATEGORIES: PackingCategory[] = [
  {
    name: "Travel Documents",
    icon: "✈️",
    items: [
      { name: "Passport (6+ months validity)", essential: true },
      { name: "Visa (if required)", essential: true },
      { name: "International SIM / pocket WiFi", essential: true },
      { name: "Travel insurance with medical coverage", essential: true },
      { name: "Printed itinerary + hotel addresses", essential: true },
      { name: "Copies of all documents (stored separately)", essential: true },
      { name: "Foreign currency / local cash", essential: true },
    ],
  },
  {
    name: "Power & Adapters",
    icon: "🔌",
    items: [
      { name: "Universal power adapter", essential: true },
      {
        name: "Voltage converter (if needed)",
        essential: false,
        note: "Most modern electronics are dual-voltage",
      },
      { name: "Portable power bank", essential: true },
    ],
  },
  {
    name: "Clothing",
    icon: "👕",
    items: [
      { name: "Versatile neutral-color layers", essential: true },
      { name: "Comfortable walking shoes (broken in)", essential: true },
      { name: "Smart casual outfit for restaurants", essential: false },
      { name: "Rain jacket / packable umbrella", essential: true },
      { name: "Scarf (doubles as a layer / modesty cover)", essential: false },
    ],
  },
  {
    name: "Luggage Tips",
    icon: "🧳",
    items: [
      { name: "Pack 1 outfit per 3 days, plan to do laundry", essential: false },
      { name: "Compression packing cubes", essential: false },
      { name: "Small day pack / daypack backpack", essential: true },
      { name: "TSA-approved toiletry bag (3-1-1 rule)", essential: true },
      { name: "Luggage lock", essential: false },
    ],
  },
];

/** Trip-specific categories keyed by template id (bundle `iae`/`oae`/`sae`/`lae`/`uae`). */
const SCOTLAND_IRELAND_CATEGORY: PackingCategory = {
  name: "Scotland & Ireland Specific",
  icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  items: [
    {
      name: "Waterproof jacket (non-negotiable)",
      essential: true,
      note: "It WILL rain, even in summer",
    },
    { name: "Waterproof hiking boots", essential: true },
    {
      name: "Wool sweater / fleece",
      essential: true,
      note: "Highland evenings are cold year-round",
    },
    { name: "UK plug adapter (Type G)", essential: true },
    {
      name: "International driving permit",
      essential: true,
      note: "Required for Republic of Ireland rental",
    },
    {
      name: "Left-side driving reminder (tape on wheel if needed)",
      essential: false,
    },
    {
      name: "Midges repellent (DEET-based)",
      essential: true,
      note: "Essential in Scottish Highlands May–Sep",
    },
  ],
};

const ITALY_CATEGORY: PackingCategory = {
  name: "Italy Specific",
  icon: "🇮🇹",
  items: [
    { name: "EU plug adapter (Type C/F)", essential: true },
    {
      name: "Modest clothing for churches",
      essential: true,
      note: "Covered shoulders & knees required at Vatican, etc.",
    },
    {
      name: "Comfortable walking sandals",
      essential: true,
      note: "Cobblestones are brutal on heels",
    },
    {
      name: "Small bills in Euros",
      essential: true,
      note: "Many smaller places are cash-only",
    },
    {
      name: "Amalfi Coast motion sickness tablets",
      essential: false,
      note: "The coastal roads are winding",
    },
  ],
};

const PACIFIC_COAST_CATEGORY: PackingCategory = {
  name: "Pacific Coast Highway Specific",
  icon: "🌊",
  items: [
    {
      name: "Layers for coastal fog (SF & Monterey)",
      essential: true,
      note: "Fog can make it feel like November even in July",
    },
    { name: "Tide chart app (for beach access)", essential: false },
    { name: "Binoculars (whale watching, elephant seals)", essential: false },
    {
      name: "National Parks Annual Pass",
      essential: false,
      note: "Covers Point Reyes, Redwoods, and more",
    },
  ],
};

const GULF_COAST_CATEGORY: PackingCategory = {
  name: "Gulf Coast Specific",
  icon: "🦐",
  items: [
    {
      name: "Heavy duty insect repellent (bayou/swamp areas)",
      essential: true,
    },
    {
      name: "Lightweight rain poncho",
      essential: true,
      note: "Afternoon thunderstorms are common",
    },
    { name: "Beach gear (umbrella, towel, floats)", essential: false },
    { name: "Cooler for crawfish & to-go food from NOLA", essential: false },
    {
      name: "Comfortable, breathable summer clothes",
      essential: true,
      note: "Gulf Coast is hot and humid",
    },
  ],
};

const NATIONAL_PARKS_CATEGORY: PackingCategory = {
  name: "National Parks Specific",
  icon: "🏔️",
  items: [
    {
      name: "America the Beautiful Annual Pass",
      essential: true,
      note: "$80 covers entrance to ALL national parks",
    },
    { name: "Hiking poles", essential: false },
    {
      name: "Hydration pack / extra water (3L+)",
      essential: true,
      note: "Altitude dehydrates faster",
    },
    {
      name: "Bear canister or bear spray",
      essential: true,
      note: "Required in parts of Yellowstone/Grand Teton",
    },
    { name: "Headlamp + extra batteries", essential: true },
    { name: "Gaiters (for muddy/snowy trails)", essential: false },
    {
      name: "Layered clothing (temp swings 40°F+ in mountain parks)",
      essential: true,
    },
  ],
};

const TRIP_SPECIFIC_CATEGORIES: Record<string, PackingCategory> = {
  scotland_ireland: SCOTLAND_IRELAND_CATEGORY,
  italy_west_coast: ITALY_CATEGORY,
  pacific_coast: PACIFIC_COAST_CATEGORY,
  gulf_coast: GULF_COAST_CATEGORY,
  northern_parks: NATIONAL_PARKS_CATEGORY,
};

/** Selectable seasons (bundle `wP`). */
export const SEASONS: Season[] = [
  { value: "summer", label: "Summer (Jun–Aug)", emoji: "☀️" },
  { value: "fall", label: "Fall (Sep–Nov)", emoji: "🍂" },
  { value: "winter", label: "Winter (Dec–Feb)", emoji: "❄️" },
  { value: "spring", label: "Spring (Mar–May)", emoji: "🌸" },
];

/**
 * Build a personalized packing list for a trip + season (bundle `cae`).
 * Categories are cloned so appending season items never mutates the shared
 * template data across renders.
 */
export function buildPackingList(trip: Trip, season: string): PackingCategory[] {
  const typeCategories = trip.roadTripDays
    ? ROAD_TRIP_CATEGORIES
    : INTERNATIONAL_CATEGORIES;
  const categories: PackingCategory[] = [
    ...BASE_CATEGORIES,
    ...typeCategories,
  ].map((category) => ({ ...category, items: [...category.items] }));

  const clothing = categories.find((category) => category.name === "Clothing");
  if (clothing) {
    if (season === "summer") clothing.items.push(...SUMMER_CLOTHING);
    else if (season === "winter") clothing.items.push(...WINTER_CLOTHING);
  }

  const specific = TRIP_SPECIFIC_CATEGORIES[trip.id];
  if (specific) categories.push(specific);

  return categories;
}
