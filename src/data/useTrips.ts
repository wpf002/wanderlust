import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Trip } from "./types";
import { trips as builtInTrips } from "./trips";

/**
 * The 7 built-in templates plus any user-authored custom trips (from
 * /api/custom-trips), merged into one list so every page — Explore, Trip
 * detail, Compare, Packing, etc. — sees custom trips alongside the built-ins.
 */
export function useTripsData(): { trips: Trip[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/custom-trips"],
  });
  const trips = useMemo(
    () => [...builtInTrips, ...(data ?? [])],
    [data],
  );
  return { trips, isLoading };
}

export function useTrips(): Trip[] {
  return useTripsData().trips;
}

export function useTrip(id: string): Trip | undefined {
  return useTripsData().trips.find((t) => t.id === id);
}
