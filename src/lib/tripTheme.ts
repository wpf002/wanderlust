import type { Trip } from "@/data/types";

export interface TripColorScheme {
  card: string;
  accent: string;
  badge: string;
}

/** Gradient/accent/badge classes by trip type (bundle `GL` / `Ore`). */
export const TRIP_COLOR_SCHEMES: Record<string, TripColorScheme> = {
  road_trip: {
    card: "from-amber-900/25 to-orange-800/15",
    accent: "text-amber-600 dark:text-amber-400",
    badge:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  },
  international: {
    card: "from-blue-900/25 to-indigo-800/15",
    accent: "text-blue-600 dark:text-blue-400",
    badge:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
  },
  beach: {
    card: "from-cyan-900/25 to-teal-800/15",
    accent: "text-cyan-600 dark:text-cyan-400",
    badge:
      "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40",
  },
  adventure: {
    card: "from-emerald-900/25 to-green-800/15",
    accent: "text-emerald-600 dark:text-emerald-400",
    badge:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  },
};

export function tripColors(trip: Trip): TripColorScheme {
  return TRIP_COLOR_SCHEMES[trip.type] || TRIP_COLOR_SCHEMES.road_trip;
}

export function tripTypeLabel(type: string): string {
  return type === "road_trip"
    ? "Road Trip"
    : type === "international"
      ? "International"
      : type;
}
