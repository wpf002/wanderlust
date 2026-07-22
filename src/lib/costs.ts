import type { BudgetTierKey, Settings, Trip } from "@/data/types";

/**
 * Trip cost estimation helpers, ported verbatim from the bundle
 * (minified `I7`, `RJ`, `IJ`, `lC`, `wL`, `on`, `bt`).
 */

/** Bundle `I7`: total driving miles for a road trip (0 for international trips). */
export function totalRoadTripMiles(trip: Trip): number {
  return trip.roadTripDays
    ? trip.roadTripDays.reduce((sum, day) => sum + day.miles, 0)
    : 0;
}

/** Bundle `RJ`: fuel cost = (total miles / mpg) * gas price. */
export function fuelCost(trip: Trip, mpg: number, gasPrice: number): number {
  return (totalRoadTripMiles(trip) / mpg) * gasPrice;
}

/** Bundle `IJ`: gallons of gas needed = total miles / mpg. */
export function gallonsNeeded(trip: Trip, mpg: number): number {
  return totalRoadTripMiles(trip) / mpg;
}

/**
 * Bundle `lC`: parse a "$90–160" style nightly price range and pick a number
 * for the budget tier — low end for budget, high end for premium, midpoint
 * (rounded) for mid-range. Falls back to $150 when the range doesn't parse.
 */
export function nightlyHotelCost(
  priceRange: string | undefined,
  budget: BudgetTierKey,
): number {
  const match = priceRange?.match(/\$?(\d+)[–\-](\d+)/);
  if (!match) return 150;
  const low = parseInt(match[1]);
  const high = parseInt(match[2]);
  return budget === "budget"
    ? low
    : budget === "premium"
      ? high
      : Math.round((low + high) / 2);
}

/**
 * Bundle `wL`: total lodging cost — one room per 2 travelers (rounded up),
 * summing the tier-adjusted nightly rate for every day except the last.
 */
export function lodgingCost(trip: Trip, settings: Settings): number {
  const days: Array<{ hotelPriceRange?: string }> =
    trip.roadTripDays || trip.tripDays || [];
  const rooms = Math.ceil(settings.travelers / 2);
  let total = 0;
  days.forEach((day, i) => {
    if (i === days.length - 1) return;
    total += nightlyHotelCost(day.hotelPriceRange, settings.budget) * rooms;
  });
  return total;
}

export interface TripCostEstimate {
  /** Road trips only. */
  fuel?: number;
  /** International trips only: flightCost * travelers. */
  flights?: number;
  lodging: number;
  activities: number;
  food: number;
  /** International trips only: activities + food. */
  dailySpend?: number;
  total: number;
  perPerson: number;
  /** Road trips only. */
  gallons?: number;
}

/**
 * Bundle `on`: the core cost-estimate function.
 *
 * Road trips:
 *   fuel       = (totalMiles / mpg) * gasPrice        (mpg defaults 28, gas 3.85)
 *   lodging    = sum(nightly rate * ceil(travelers/2)) for all but the last day
 *   activities = perPersonPerDay * 0.25 * travelers * totalDays
 *   food       = perPersonPerDay * 0.35 * travelers * totalDays
 *   total      = fuel + lodging + activities + food
 *
 * International trips:
 *   flights    = flightCost * travelers
 *   lodging    = same room math as road trips
 *   activities = perPersonPerDay * 0.30 * travelers * totalDays
 *   food       = perPersonPerDay * 0.30 * travelers * totalDays
 *   total      = flights + lodging + activities + food
 */
export function estimateTripCosts(
  trip: Trip,
  settings: Settings,
): TripCostEstimate {
  if (trip.roadTripDays) {
    const fuel = fuelCost(trip, settings.mpg || 28, settings.gasPrice || 3.85);
    const lodging = lodgingCost(trip, settings);
    const gallons = gallonsNeeded(trip, settings.mpg || 28);
    const tier = trip.dailyBudgets[settings.budget];
    const activities =
      tier.perPersonPerDay * 0.25 * settings.travelers * trip.totalDays;
    const food =
      tier.perPersonPerDay * 0.35 * settings.travelers * trip.totalDays;
    const total = fuel + lodging + activities + food;
    return {
      fuel,
      lodging,
      activities,
      food,
      total,
      perPerson: total / settings.travelers,
      gallons,
    };
  } else {
    const flights = (settings.flightCost || 0) * settings.travelers;
    const lodging = lodgingCost(trip, settings);
    const tier = trip.dailyBudgets[settings.budget];
    const activities =
      tier.perPersonPerDay * 0.3 * settings.travelers * trip.totalDays;
    const food =
      tier.perPersonPerDay * 0.3 * settings.travelers * trip.totalDays;
    const dailySpend = activities + food;
    const total = flights + lodging + dailySpend;
    return {
      flights,
      lodging,
      activities,
      food,
      dailySpend,
      total,
      perPerson: total / settings.travelers,
    };
  }
}

/** Bundle `bt`: whole-dollar currency formatting ("$1,234"). */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
