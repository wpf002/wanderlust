import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  GitCompare,
  PlusCircle,
  X,
  Clock,
  MapPin,
  Activity,
  Users,
  Gauge,
  Plane,
  Globe,
  Sun,
  Sparkles,
} from "lucide-react";
import { useTrips } from "@/data/useTrips";
import { DEFAULT_SETTINGS, type Trip, type Settings } from "@/data/types";
import {
  estimateTripCosts,
  formatCurrency,
  type TripCostEstimate,
} from "@/lib/costs";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import Slider from "@/components/Slider";

/** Total number of attraction stops across all days of a trip. */
function countStops(trip: Trip): number {
  if (trip.roadTripDays) {
    return trip.roadTripDays.reduce((sum, day) => sum + day.attractions.length, 0);
  }
  return trip.tripDays?.reduce((sum, day) => sum + (day.attractions?.length ?? 0), 0) ?? 0;
}


/** Bundle `Th`: a labeled cost bar with an accent-colored fill. */
function CostBar({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  accent: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold w-20 text-right">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

/**
 * Panels each trip contributes: summary, cost breakdown, trip info, highlights.
 * The comparison grid uses this as its row count — keep it in step if a panel
 * is added or removed.
 */
const PANELS_PER_TRIP = 4;

/** Bundle `pae`: a single trip's comparison column. */
function ComparisonCard({
  template,
  settings,
}: {
  template: Trip;
  settings: Settings;
}) {
  const estimate = estimateTripCosts(template, settings);
  const isRoadTrip = !!template.roadTripDays;
  const accentText =
    template.type === "road_trip"
      ? "text-amber-600 dark:text-amber-400"
      : template.type === "international"
        ? "text-blue-600 dark:text-blue-400"
        : "text-emerald-600 dark:text-emerald-400";
  const accentBar =
    template.type === "road_trip"
      ? "bg-amber-500"
      : template.type === "international"
        ? "bg-blue-500"
        : "bg-emerald-500";
  const miles = isRoadTrip
    ? template.roadTripDays!.reduce((sum, day) => sum + day.miles, 0)
    : null;
  const stops = countStops(template);

  // Always the same rows in the same order, with an em dash where a trip has
  // no answer. Skipping a row would slide every later label out of step with
  // the trip beside it, which is the one thing a comparison can't afford.
  const infoRows: { icon: ReactNode; label: string; val: string }[] = [
    { icon: <Clock size={11} />, label: "Duration", val: `${template.totalDays} days` },
    {
      icon: <Gauge size={11} />,
      label: "Miles",
      val: miles ? miles.toLocaleString() : "—",
    },
    { icon: <Globe size={11} />, label: "Countries", val: template.countries.join(", ") },
    { icon: <MapPin size={11} />, label: "Attractions", val: `${stops} stops` },
    { icon: <Sun size={11} />, label: "Best Time", val: template.bestMonths },
    {
      icon: <Activity size={11} />,
      label: "Difficulty",
      val: template.difficulty ? `${template.difficulty.overall.toFixed(1)} / 5` : "—",
    },
  ];

  return (
    // `contents` dissolves this wrapper so the four panels below become items
    // of the comparison grid itself and can line up with the other trips'.
    <div className="contents">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-2">
          <span className="text-2xl leading-none">{template.emoji}</span>
          {/* Reserved height keeps side-by-side columns even when names/subtitles
              wrap to different line counts (especially on narrow screens). */}
          <div className="min-w-0 min-h-[4.75rem]">
            <h3 className="font-display font-bold text-base leading-tight line-clamp-2">
              {template.name}
            </h3>
            <p className="mt-1 text-xs leading-snug text-[var(--color-text-muted)] line-clamp-2">
              {template.subtitle}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center bg-[var(--color-surface-offset)] rounded-xl p-2">
            <div className={`font-bold text-lg ${accentText}`}>
              {formatCurrency(estimate.total)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Total</div>
          </div>
          <div className="text-center bg-[var(--color-surface-offset)] rounded-xl p-2">
            <div className={`font-bold text-lg ${accentText}`}>
              {formatCurrency(estimate.perPerson)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Per person</div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2.5">
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Cost Breakdown
        </h4>
        <CostBar
          label={isRoadTrip ? "Fuel" : "Flights"}
          value={isRoadTrip ? estimate.fuel || 0 : estimate.flights || 0}
          max={estimate.total}
          accent={accentBar}
        />
        <CostBar label="Lodging" value={estimate.lodging} max={estimate.total} accent={accentBar} />
        <CostBar label="Activities" value={estimate.activities || 0} max={estimate.total} accent={accentBar} />
        <CostBar label="Food" value={estimate.food || 0} max={estimate.total} accent={accentBar} />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2">
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Trip Info
        </h4>
        {/* A uniform row height keeps each label level with the same label in
            the next trip, even when a value like "Best Time" runs to two
            lines. Values are clamped so a very long one can't outgrow it. */}
        {infoRows.map(({ icon, label, val }) => (
          <div
            key={label}
            className="flex min-h-[2.5rem] items-center justify-between gap-3 text-sm"
          >
            <span className="flex shrink-0 items-center gap-1.5 text-[var(--color-text-muted)]">
              {icon} {label}
            </span>
            <span className="line-clamp-2 text-right text-xs font-medium">{val}</span>
          </div>
        ))}
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Highlights
        </h4>
        <ul className="space-y-1.5">
          {template.highlights.slice(0, 5).map((highlight, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]"
            >
              <Sparkles
                size={11}
                className="mt-0.5 shrink-0 text-[var(--color-primary)]"
              />
              {highlight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [, navigate] = useLocation();
  const trips = useTrips();
  const [selectedIds, setSelectedIds] = useState<string[]>([
    trips[0].id,
    trips[1].id,
  ]);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });

  const selectedTrips = selectedIds
    .map((id) => trips.find((trip) => trip.id === id))
    .filter((trip): trip is Trip => Boolean(trip));
  const estimates: TripCostEstimate[] = selectedTrips.map((trip) =>
    estimateTripCosts(trip, settings),
  );
  const hasRoadTrip = selectedTrips.some((trip) => !!trip.roadTripDays);
  const hasFlightTrip = selectedTrips.some((trip) => !trip.roadTripDays);


  function addTrip() {
    const available = trips.filter((trip) => !selectedIds.includes(trip.id));
    if (available.length > 0) setSelectedIds([...selectedIds, available[0].id]);
  }

  function removeTrip(id: string) {
    if (selectedIds.length > 2) {
      setSelectedIds(selectedIds.filter((existing) => existing !== id));
    }
  }

  function changeTrip(oldId: string, newId: string) {
    // Guard against picking a trip already shown in another column (the
    // original disables those options; the shared Select has no disabled prop).
    if (newId !== oldId && selectedIds.includes(newId)) return;
    setSelectedIds(selectedIds.map((id) => (id === oldId ? newId : id)));
  }


  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <GitCompare size={18} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Trip Comparison</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Compare 2–4 trips side-by-side
              </p>
            </div>
          </div>
          {selectedIds.length < 4 && (
            <button
              onClick={addTrip}
              data-testid="btn-add-comparison"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <PlusCircle size={13} /> Add trip
            </button>
          )}
        </div>

        <div
          className="grid gap-3 mb-6 overflow-x-auto pb-1"
          style={{ gridTemplateColumns: `repeat(${selectedIds.length}, minmax(min(11rem, 100%), 1fr))` }}
        >
          {selectedIds.map((id, index) => (
            <div key={id} className="flex items-center gap-2">
              <Select value={id} onValueChange={(newId) => changeTrip(id, newId)}>
                <SelectTrigger data-testid={`select-trip-${index}`} className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem
                      key={trip.id}
                      value={trip.id}
                      className={
                        selectedIds.includes(trip.id) && trip.id !== id
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    >
                      {trip.emoji} {trip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIds.length > 2 && (
                <button
                  onClick={() => removeTrip(id)}
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]"
                  data-testid={`btn-remove-trip-${index}`}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            Shared Settings
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
                <span className="flex items-center gap-1">
                  <Users size={11} /> Travelers
                </span>
                <span className="font-bold text-[var(--color-text)]">
                  {settings.travelers}
                </span>
              </label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[settings.travelers]}
                onValueChange={([v]) => setSettings({ ...settings, travelers: v })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">
                Budget
              </label>
              <Select
                value={settings.budget}
                onValueChange={(v) =>
                  setSettings({ ...settings, budget: v as Settings["budget"] })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="midrange">Mid-range</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasRoadTrip && (
              <div>
                <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <Gauge size={11} /> MPG
                  </span>
                  <span className="font-bold text-[var(--color-text)]">
                    {settings.mpg}
                  </span>
                </label>
                <Slider
                  min={10}
                  max={60}
                  step={1}
                  value={[settings.mpg || 28]}
                  onValueChange={([v]) => setSettings({ ...settings, mpg: v })}
                />
              </div>
            )}
            {hasFlightTrip && (
              <div>
                <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <Plane size={11} /> Flight/person
                  </span>
                  <span className="font-bold text-[var(--color-text)]">
                    ${settings.flightCost}
                  </span>
                </label>
                <Slider
                  min={300}
                  max={3000}
                  step={50}
                  value={[settings.flightCost || 1100]}
                  onValueChange={([v]) => setSettings({ ...settings, flightCost: v })}
                />
              </div>
            )}
          </div>
        </div>


        {/* Each column's panels are grid items of *this* grid rather than of
            their own stack, so the matching panels across trips share a row and
            stretch to the same height. Column-major flow keeps a trip's panels
            in its own column; the row count is PANELS_PER_TRIP below. */}
        <div
          className="grid gap-4 overflow-x-auto pb-1"
          style={{
            gridAutoFlow: "column",
            gridTemplateRows: `repeat(${PANELS_PER_TRIP}, auto)`,
            gridAutoColumns: `minmax(min(11rem, 100%), 1fr)`,
          }}
        >
          {selectedTrips.map((trip) => (
            <ComparisonCard key={trip.id} template={trip} settings={settings} />
          ))}
        </div>

        <div
          className="grid gap-4 mt-6 overflow-x-auto pb-1"
          style={{ gridTemplateColumns: `repeat(${selectedTrips.length}, minmax(min(11rem, 100%), 1fr))` }}
        >
          {selectedTrips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Plan {trip.name} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
