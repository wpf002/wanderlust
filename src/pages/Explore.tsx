import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Gauge, Plane, Compass, PlusCircle, Plus, Search, X } from "lucide-react";
import type { GasPriceData, Settings } from "@/data/types";
import { useTrips } from "@/data/useTrips";
import { estimateTripCosts } from "@/lib/costs";
import Navbar from "@/components/Navbar";
import Slider from "@/components/Slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import TripCard, { type Rating } from "@/components/TripCard";

const FILTERS = [
  { id: "all", label: "All Trips" },
  { id: "road_trip", label: "Road Trip" },
  { id: "international", label: "International" },
  { id: "budget", label: "Budget-Friendly" },
  { id: "nightlife", label: "Nightlife & Food" },
  { id: "adventure", label: "Adventure & Surf" },
  { id: "nature", label: "Nature & Parks" },
  { id: "coastal", label: "Coastal" },
];

const NATURE_KEYWORDS = [
  "national parks",
  "hiking",
  "mountains",
  "parks",
  "nature",
  "wildlife",
  "camping",
];
const COASTAL_KEYWORDS = [
  "coast",
  "beach",
  "ocean",
  "coastal",
  "gulf",
  "pacific",
  "atlantic",
];
const NIGHTLIFE_KEYWORDS = [
  "nightlife",
  "pubs",
  "music",
  "food scene",
  "food & wine",
  "city",
];
const ADVENTURE_KEYWORDS = [
  "adventure",
  "surfing",
  "surf",
  "hiking",
  "sports",
  "epic scenery",
];

interface ExploreProps {
  settings: Settings;
  setSettings: (s: Settings) => void;
  gasPriceData: GasPriceData | null;
}

/** Explore / home page (bundle `Mre`). */
export default function ExplorePage({
  settings,
  setSettings,
  gasPriceData,
}: ExploreProps) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const trips = useTrips();

  const { data: ratingsList = [] } = useQuery<Rating[]>({
    queryKey: ["/api/ratings"],
  });
  const ratingsById = Object.fromEntries(
    ratingsList.map((r) => [r.templateId, r]),
  );

  function toggleTag(tag: string) {
    setActiveTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    );
  }

  const filtered = useMemo(
    () =>
      trips.filter((trip) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            trip.name.toLowerCase().includes(q) ||
            trip.subtitle.toLowerCase().includes(q) ||
            trip.highlights.some((h) => h.toLowerCase().includes(q)) ||
            trip.tags.some((t) => t.toLowerCase().includes(q)) ||
            trip.countries.some((c) => c.toLowerCase().includes(q));
          if (!matches) return false;
        }
        if (filter !== "all") {
          if (filter === "road_trip" && trip.type !== "road_trip") return false;
          if (filter === "international" && trip.type !== "international")
            return false;
          // "Budget-Friendly" means the trip *can* be done cheaply — judge it at
          // its budget tier, not whatever tier is currently selected.
          if (
            filter === "budget" &&
            estimateTripCosts(trip, { ...settings, budget: "budget" }).perPerson > 2000
          )
            return false;
          if (
            filter === "nightlife" &&
            !trip.tags.some((t) =>
              NIGHTLIFE_KEYWORDS.some((k) => t.toLowerCase().includes(k)),
            )
          )
            return false;
          if (
            filter === "adventure" &&
            !trip.tags.some((t) =>
              ADVENTURE_KEYWORDS.some((k) => t.toLowerCase().includes(k)),
            )
          )
            return false;
          if (
            filter === "nature" &&
            !trip.tags.some((t) =>
              NATURE_KEYWORDS.some((k) => t.toLowerCase().includes(k)),
            )
          )
            return false;
          if (
            filter === "coastal" &&
            !(
              trip.tags.some((t) =>
                COASTAL_KEYWORDS.some((k) => t.toLowerCase().includes(k)),
              ) ||
              trip.name.toLowerCase().includes("coast") ||
              trip.name.toLowerCase().includes("gulf")
            )
          )
            return false;
        }
        if (activeTags.length > 0 && !activeTags.every((t) => trip.tags.includes(t)))
          return false;
        return true;
      }),
    [search, filter, activeTags, settings, trips],
  );

  const hasFilters = !!search.trim() || filter !== "all" || activeTags.length > 0;

  function clearFilters() {
    setSearch("");
    setFilter("all");
    setActiveTags([]);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="text-center mb-10">
          <p className="text-[var(--color-primary)] text-xs font-semibold tracking-widest uppercase mb-2">
            Your Next Adventure
          </p>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-3">
            Wander Anywhere
          </h1>
          <p className="text-[var(--color-text-muted)] text-base max-w-lg mx-auto">
            Pre-built itineraries for iconic trips, or describe your dream
            vacation and we'll build it for you.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => navigate("/plan")}
              data-testid="btn-plan-custom"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <PlusCircle size={15} /> Plan a Custom Trip
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("prebuilt")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <Compass size={15} /> Browse Trips
            </button>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
              Personalize Estimates
            </p>
            {gasPriceData?.isLive && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live gas prices updated {gasPriceData.date}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mb-2">
                <Users size={11} /> Travelers
              </label>
              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={8}
                  step={1}
                  value={[settings.travelers]}
                  onValueChange={([v]) => setSettings({ ...settings, travelers: v })}
                  className="flex-1"
                  data-testid="slider-travelers"
                />
                <span className="text-sm font-bold w-6 text-right">
                  {settings.travelers}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mb-2">
                <DollarSign size={11} /> Budget Tier
              </label>
              <Select
                value={settings.budget}
                onValueChange={(v) =>
                  setSettings({ ...settings, budget: v as Settings["budget"] })
                }
              >
                <SelectTrigger className="h-8 text-sm" data-testid="select-budget">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="midrange">Mid-range</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mb-2">
                <Gauge size={11} /> Car MPG
              </label>
              <div className="flex items-center gap-3">
                <Slider
                  min={10}
                  max={60}
                  step={1}
                  value={[settings.mpg || 28]}
                  onValueChange={([v]) => setSettings({ ...settings, mpg: v })}
                  className="flex-1"
                  data-testid="slider-mpg"
                />
                <span className="text-sm font-bold w-8 text-right">
                  {settings.mpg}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mb-2">
                <Plane size={11} /> Intl. Flight ($)
              </label>
              <div className="flex items-center gap-3">
                <Slider
                  min={300}
                  max={3000}
                  step={50}
                  value={[settings.flightCost || 1100]}
                  onValueChange={([v]) => setSettings({ ...settings, flightCost: v })}
                  className="flex-1"
                  data-testid="slider-flight"
                />
                <span className="text-sm font-bold w-14 text-right">
                  ${settings.flightCost}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div id="prebuilt">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl">Featured Itineraries</h2>
            <button
              onClick={() => navigate("/create")}
              data-testid="btn-create-trip"
              className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <Plus size={15} /> Create a Trip
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
              />
              <input
                data-testid="search-trips"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtered.length > 0)
                    navigate(`/trip/${filtered[0].id}`);
                }}
                placeholder="Search by destination, country, or tag…"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] placeholder-[var(--color-text-faint)]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  data-testid={`filter-${f.id}`}
                  onClick={() => setFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    filter === f.id
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {activeTags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-[var(--color-text-faint)]">Tags:</span>
                {activeTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 flex items-center gap-1 hover:bg-[var(--color-primary)]/25 transition-colors"
                  >
                    {tag} <X size={10} />
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-muted)]">
                {filtered.length} of {trips.length} trips
                {hasFilters ? " matching your filters" : " available"}
              </p>
              {hasFilters && (
                <button
                  data-testid="clear-filters"
                  onClick={clearFilters}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((trip) => (
                <TripCard
                  key={trip.id}
                  template={trip}
                  settings={settings}
                  onExplore={() => navigate(`/trip/${trip.id}`)}
                  rating={ratingsById[trip.id] || null}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search
                size={36}
                className="mx-auto text-[var(--color-text-faint)] mb-3"
              />
              <p className="text-[var(--color-text-muted)] font-medium">
                No trips match your filters
              </p>
              <p className="text-sm text-[var(--color-text-faint)] mt-1">
                Try a different search or clear your filters
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 text-sm px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
              >
                Show all trips
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-center border-t border-[var(--color-border)] mt-8">
        <p className="text-xs text-[var(--color-text-faint)]">
          Cost estimates are illustrative. Gas price: $3.85/gal (AAA avg, July
          2026). Hotel prices reflect peak season. Flight prices are round-trip
          estimates.
        </p>
      </footer>
    </div>
  );
}
