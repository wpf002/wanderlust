import {
  ArrowRight,
  CalendarDays,
  Car,
  Globe,
  Plane,
  Sparkles,
} from "lucide-react";
import type { Settings, Trip } from "@/data/types";
import { estimateTripCosts, formatCurrency } from "@/lib/costs";
import { tripColors, tripTypeLabel } from "@/lib/tripTheme";
import StarRating from "@/components/StarRating";

export interface Rating {
  templateId: string;
  stars: number;
  review?: string | null;
}

interface TripCardProps {
  template: Trip;
  settings: Settings;
  onExplore: () => void;
  rating: Rating | null;
}

/** Featured-itinerary card on the Explore page. */
export default function TripCard({
  template,
  settings,
  onExplore,
  rating,
}: TripCardProps) {
  const colors = tripColors(template);
  const isRoadTrip = !!template.roadTripDays;
  const cost = estimateTripCosts(template, settings);
  const overall = Math.round((template.difficulty?.overall ?? 0) * 10) / 10;

  const location =
    template.countries.length > 1
      ? `${template.countries.length} countries`
      : template.countries[0];
  const transport =
    template.primaryTransport === "car"
      ? { icon: <Car size={13} />, label: "Drive" }
      : template.primaryTransport === "mixed"
        ? { icon: <Plane size={13} />, label: "Flight + drive" }
        : { icon: <Plane size={13} />, label: "Fly" };

  const primaryCost = isRoadTrip ? cost.fuel : cost.flights;
  const primaryLabel = isRoadTrip ? "Fuel" : "Flights";

  return (
    <div
      data-testid={`card-trip-${template.id}`}
      onClick={onExplore}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onExplore();
      }}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)]/50 hover:shadow-xl"
    >
      {/* ── Banner ─────────────────────────────────────────── */}
      <div className={`relative h-24 overflow-hidden ${colors.banner}`}>
        {/* oversized decorative emoji */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-6 -right-3 select-none text-[6rem] leading-none opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
        >
          {template.emoji}
        </span>

        <div className="relative flex items-start justify-between p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface)]/80 text-2xl shadow-sm backdrop-blur-sm">
            {template.emoji}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors.badge}`}
          >
            {tripTypeLabel(template.type)}
          </span>
        </div>

        <span className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/85 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm">
          <CalendarDays size={12} className={colors.accent} />
          {template.totalDays} days
        </span>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        <div className="min-h-[3.25rem]">
          <h3 className="font-display text-[17px] font-bold leading-tight line-clamp-1">
            {template.name}
          </h3>
          <p className="mt-1 text-xs leading-snug text-[var(--color-text-muted)] line-clamp-2">
            {template.subtitle}
          </p>
        </div>

        {/* meta row */}
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <Globe size={13} className={colors.accent} />
            <span className="truncate">{location}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={colors.accent}>{transport.icon}</span>
            {transport.label}
          </span>
        </div>

        {/* tags */}
        <div className="mt-3 flex flex-wrap gap-1.5 min-h-[1.75rem] content-start">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--color-surface-offset)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-faint)]">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* highlights */}
        <div className="mt-3 flex items-start gap-1.5 min-h-[2.5rem]">
          <Sparkles size={12} className={`${colors.accent} mt-0.5 shrink-0`} />
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
            {template.highlights.slice(0, 3).join(" · ")}
          </p>
        </div>

        {/* difficulty + optional rating */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-[var(--color-text-faint)]">
              Difficulty
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 w-1.5 rounded-full ${
                    n <= Math.round(overall)
                      ? colors.dot
                      : "bg-[var(--color-surface-offset)]"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              {overall}
            </span>
          </div>
          {rating && <StarRating stars={rating.stars} />}
        </div>
      </div>

      {/* ── Price footer ───────────────────────────────────── */}
      <div className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Est. per person
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(cost.perPerson)}
            </div>
          </div>
          <div className="text-right text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            <div>
              {primaryLabel} {formatCurrency(primaryCost || 0)}
            </div>
            <div>Lodging {formatCurrency(cost.lodging)}</div>
          </div>
        </div>
        <div
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-[var(--color-primary-hover)]`}
        >
          View Itinerary
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </div>
  );
}
