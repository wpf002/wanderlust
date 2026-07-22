import { useState, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "wouter";
import {
  Calendar,
  ChevronRight,
  Clock,
  CloudSun,
  DollarSign,
  Globe,
  MapPin,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import type { BudgetTierKey, Settings, Trip } from "@/data/types";
import { trips } from "@/data/trips";
import { lookupCity } from "@/data/cityCoords";
import { estimateTripCosts } from "@/lib/costs";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import Slider from "@/components/Slider";
import {
  DEFAULT_PLAN_FORM,
  INTEREST_OPTIONS,
  MONTHS,
  ROUTE_WAYPOINTS,
  TRIP_TYPE_OPTIONS,
  type PlanForm,
} from "@/data/planner";
import {
  forecastDateForMonth,
  guessDestinationCity,
  matchTemplates,
  planToSettings,
} from "./plan/logic";
import ResultCard, { type ResultCardColors } from "./plan/ResultCard";

interface PlanPageProps {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  lastForm: unknown;
  setLastForm: Dispatch<SetStateAction<unknown>>;
}

const BUDGET_TIERS: readonly BudgetTierKey[] = ["budget", "midrange", "premium"];

const PACE_OPTIONS = [
  { v: "relaxed", label: "Relaxed", desc: "Fewer stops" },
  { v: "moderate", label: "Moderate", desc: "Balanced mix" },
  { v: "packed", label: "Packed", desc: "See everything" },
] as const;

const ACCOMMODATION_OPTIONS = [
  { v: "hotel", label: "🏨 Hotels" },
  { v: "hostel", label: "🛏️ Hostels" },
  { v: "vacation_rental", label: "🏡 Vacation Rental" },
  { v: "mixed", label: "🔀 Mixed" },
] as const;

/** Bundle inline color map for match cards, keyed by trip type. */
function matchColors(type: string): ResultCardColors {
  const map: Record<string, ResultCardColors> = {
    road_trip: {
      accent: "text-amber-600 dark:text-amber-400",
      badge:
        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
    },
    international: {
      accent: "text-blue-600 dark:text-blue-400",
      badge:
        "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
    },
  };
  return (
    map[type] || {
      accent: "text-emerald-600 dark:text-emerald-400",
      badge:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
    }
  );
}

/** Collect the weather cities to seed a match card's forecast strip. */
function weatherCitiesFor(template: Trip, destination: string): string[] {
  const waypoints = ROUTE_WAYPOINTS[template.id] || [];
  const cities: string[] = [];
  if (waypoints.length > 0 && lookupCity(waypoints[0].name)) {
    cities.push(waypoints[0].name);
  }
  const guessed = guessDestinationCity(destination);
  if (guessed && lookupCity(guessed) && !cities.includes(guessed)) {
    cities.unshift(guessed);
  }
  const days = (template.roadTripDays || template.tripDays || []) as Array<{
    overnight?: unknown;
  }>;
  days.slice(0, 4).forEach((day) => {
    const overnight = day.overnight;
    if (
      typeof overnight === "string" &&
      lookupCity(overnight) &&
      !cities.includes(overnight)
    ) {
      cities.push(overnight);
    }
  });
  return cities;
}

/** Bundle `Yre`: the custom-trip planner wizard (`/plan`). */
export default function PlanPage({
  settings,
  setSettings,
  lastForm,
  setLastForm,
}: PlanPageProps) {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<PlanForm>(
    (lastForm as PlanForm | null) || DEFAULT_PLAN_FORM,
  );
  const [matches, setMatches] = useState<Trip[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [step, setStep] = useState(1);

  const findTrips = () => {
    setLastForm(form);
    const matched = matchTemplates(form, trips);
    setMatches(matched.length > 0 ? matched : trips.slice(0, 3));
    setShowResults(true);
    setStep(2);
    setSettings({ ...settings, travelers: form.travelers, budget: form.budget });
  };

  const toggleInterest = (value: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter((i) => i !== value)
        : [...prev.interests, value],
    }));
  };

  const costSettings: Settings = {
    ...planToSettings(form),
    mpg: settings.mpg,
    gasPrice: settings.gasPrice,
    flightCost: settings.flightCost,
  };
  const forecastDate = forecastDateForMonth(form.travelMonth);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-[var(--color-primary)] text-xs font-semibold tracking-widest uppercase mb-2">
            Trip Planner
          </p>
          <h1 className="font-display font-bold text-3xl mb-2">
            Plan Your Vacation
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Tell us what you're looking for and we'll match you with the perfect
            itinerary.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-8">
          {["Tell us about your trip", "See your matches"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > i || step === i + 1
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  step === i + 1
                    ? "font-semibold"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                {label}
              </span>
              {i < 1 && (
                <ChevronRight
                  size={14}
                  className="text-[var(--color-text-faint)] ml-1"
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <MapPin size={11} /> Where do you want to go?
              </label>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
                />
                <input
                  data-testid="input-destination"
                  type="text"
                  placeholder='e.g. "Western coast of Italy", "Route 66", "Yellowstone"'
                  value={form.destination}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, destination: e.target.value }))
                  }
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Globe size={11} /> Trip Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRIP_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    data-testid={`trip-type-${option.value}`}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, tripType: option.value }))
                    }
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all ${
                      form.tripType === option.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]"
                    }`}
                  >
                    <span className="text-base">{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar size={11} /> Travel Month
                </label>
                <Select
                  value={form.travelMonth}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, travelMonth: value }))
                  }
                >
                  <SelectTrigger className="text-sm h-9" data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Clock size={11} /> Duration —{" "}
                  <span className="font-bold text-[var(--color-text)]">
                    {form.duration} days
                  </span>
                </label>
                <Slider
                  min={3}
                  max={21}
                  step={1}
                  value={[form.duration]}
                  onValueChange={([value]) =>
                    setForm((prev) => ({ ...prev, duration: value }))
                  }
                  data-testid="slider-duration"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Users size={11} /> Travelers —{" "}
                  <span className="font-bold text-[var(--color-text)]">
                    {form.travelers}
                  </span>
                </label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[form.travelers]}
                  onValueChange={([value]) =>
                    setForm((prev) => ({ ...prev, travelers: value }))
                  }
                  data-testid="slider-travelers-form"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <DollarSign size={11} /> Budget Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BUDGET_TIERS.map((tier) => (
                    <button
                      key={tier}
                      data-testid={`budget-${tier}`}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, budget: tier }))
                      }
                      className={`py-2 rounded-xl border text-xs font-medium capitalize transition-all ${
                        form.budget === tier
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]"
                      }`}
                    >
                      {tier === "midrange"
                        ? "Mid-range"
                        : tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
                Travel Pace
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PACE_OPTIONS.map((option) => (
                  <button
                    key={option.v}
                    data-testid={`pace-${option.v}`}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, pace: option.v }))
                    }
                    className={`flex flex-col p-2.5 rounded-xl border text-left transition-all ${
                      form.pace === option.v
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]"
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold ${
                        form.pace === option.v
                          ? "text-[var(--color-primary)]"
                          : ""
                      }`}
                    >
                      {option.label}
                    </div>
                    <div className="text-xs text-[var(--color-text-faint)] mt-0.5 leading-snug">
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
                Accommodation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOMMODATION_OPTIONS.map((option) => (
                  <button
                    key={option.v}
                    data-testid={`accom-${option.v}`}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, accommodation: option.v }))
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      form.accommodation === option.v
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
                Interests (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    data-testid={`interest-${option.value}`}
                    onClick={() => toggleInterest(option.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      form.interests.includes(option.value)
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]"
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              data-testid="btn-find-trips"
              onClick={findTrips}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors shadow-md"
            >
              <Sparkles size={16} /> Find My Perfect Trip
            </button>
          </div>
        </div>

        {showResults && (
          <div data-testid="results-section">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-primary)]" />
                <h2 className="font-display font-bold text-lg">
                  {matches.length > 0
                    ? `${matches.length} trips match your vibe`
                    : "Here are our top picks"}
                </h2>
              </div>
              <span className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
                <CloudSun size={11} /> Expand each for {form.travelMonth} weather
              </span>
            </div>
            <div className="space-y-4">
              {matches.map((template, rank) => (
                <ResultCard
                  key={template.id}
                  template={template}
                  rank={rank}
                  costs={estimateTripCosts(template, costSettings)}
                  colors={matchColors(template.type)}
                  weatherCities={weatherCitiesFor(template, form.destination)}
                  forecastDate={forecastDate}
                  travelMonth={form.travelMonth}
                  onView={() => navigate(`/trip/${template.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
