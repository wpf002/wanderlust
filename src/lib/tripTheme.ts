import type { Trip } from "@/data/types";

export interface TripColorScheme {
  /** Subtle card-background gradient (from/to classes). */
  card: string;
  /** Richer banner gradient for the card header. */
  banner: string;
  /** Accent text color. */
  accent: string;
  /** Solid dot/fill color (Tailwind bg-*) for meters. */
  dot: string;
  /** Pill/badge classes. */
  badge: string;
}

/** Gradient/accent/badge classes by trip type (bundle `GL` / `Ore`, extended). */
export const TRIP_COLOR_SCHEMES: Record<string, TripColorScheme> = {
  road_trip: {
    card: "from-amber-900/25 to-orange-800/15",
    banner:
      "bg-gradient-to-br from-amber-400/40 via-orange-500/25 to-orange-600/10 dark:from-amber-500/30 dark:via-orange-500/20 dark:to-orange-700/10",
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    badge:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  },
  international: {
    card: "from-blue-900/25 to-indigo-800/15",
    banner:
      "bg-gradient-to-br from-blue-400/40 via-indigo-500/25 to-indigo-600/10 dark:from-blue-500/30 dark:via-indigo-500/20 dark:to-indigo-700/10",
    accent: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    badge:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
  },
  beach: {
    card: "from-cyan-900/25 to-teal-800/15",
    banner:
      "bg-gradient-to-br from-cyan-400/40 via-teal-500/25 to-teal-600/10 dark:from-cyan-500/30 dark:via-teal-500/20 dark:to-teal-700/10",
    accent: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
    badge:
      "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40",
  },
  adventure: {
    card: "from-emerald-900/25 to-green-800/15",
    banner:
      "bg-gradient-to-br from-emerald-400/40 via-green-500/25 to-green-600/10 dark:from-emerald-500/30 dark:via-green-500/20 dark:to-green-700/10",
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
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
