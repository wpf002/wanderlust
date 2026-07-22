import { Star, ArrowRight } from "lucide-react";
import type { Settings, Trip } from "@/data/types";
import { estimateTripCosts, formatCurrency } from "@/lib/costs";
import { tripColors, tripTypeLabel } from "@/lib/tripTheme";
import DifficultyMeter from "@/components/DifficultyMeter";
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

/** Featured-itinerary card on the Explore page (bundle `Pre`). */
export default function TripCard({
  template,
  settings,
  onExplore,
  rating,
}: TripCardProps) {
  const colors = tripColors(template);
  const isRoadTrip = !!template.roadTripDays;
  const cost = estimateTripCosts(template, settings);

  return (
    <div
      data-testid={`card-trip-${template.id}`}
      className={`relative bg-gradient-to-br ${colors.card} border border-[var(--color-border)] rounded-2xl overflow-hidden group hover:border-[var(--color-primary)]/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col h-full`}
      onClick={onExplore}
    >
      <div className="bg-[var(--color-surface)]/70 backdrop-blur-sm p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="text-2xl leading-none mt-0.5">{template.emoji}</span>
            <div className="min-w-0 min-h-[5rem]">
              <h3 className="font-display font-bold text-base leading-tight line-clamp-2">
                {template.name}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-snug line-clamp-2">
                {template.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {template.isCustom && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-[var(--color-primary)]/40 text-[var(--color-primary)] bg-[var(--color-primary)]/10">
                Custom
              </span>
            )}
            <span
              className={`${colors.badge} border text-xs px-2 py-0.5 rounded-full font-medium`}
            >
              {tripTypeLabel(template.type)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center py-2 bg-[var(--color-surface-offset)]/60 rounded-lg">
            <div className={`text-sm font-bold ${colors.accent}`}>
              {template.totalDays}{" "}
              <span className="font-normal text-xs text-[var(--color-text-muted)]">
                days
              </span>
            </div>
          </div>
          <div className="text-center py-2 bg-[var(--color-surface-offset)]/60 rounded-lg">
            <div className={`text-xs font-bold ${colors.accent} leading-tight`}>
              {template.countries.length > 1
                ? `${template.countries.length} countries`
                : template.countries[0]}
            </div>
          </div>
          <div className="text-center py-2 bg-[var(--color-surface-offset)]/60 rounded-lg">
            <div className={`text-xs font-bold ${colors.accent}`}>
              {template.primaryTransport === "car"
                ? "🚗 Drive"
                : template.primaryTransport === "mixed"
                  ? "✈️ Mixed"
                  : "✈️ Fly"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3 min-h-[3.25rem] content-start">
          {template.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 h-fit rounded-full border ${colors.badge}`}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-start gap-1.5 mb-3 min-h-[3.5rem]">
          <Star size={11} className={`${colors.accent} mt-0.5 shrink-0`} />
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-3">
            {template.highlights.slice(0, 3).join(" · ")}
          </p>
        </div>

        {rating && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <StarRating stars={rating.stars} />
            <span className="text-xs text-[var(--color-text-muted)]">
              Your rating
            </span>
            {rating.review && (
              <span className="text-xs text-[var(--color-text-faint)] truncate max-w-[120px]">
                “{rating.review}”
              </span>
            )}
          </div>
        )}

        {template.difficulty && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 px-1 mt-auto">
            <DifficultyMeter score={template.difficulty.overall} label="Overall" />
            {template.roadTripDays && template.difficulty.driveIntensity != null && (
              <DifficultyMeter
                score={template.difficulty.driveIntensity}
                label="Drive"
              />
            )}
            <DifficultyMeter
              score={template.difficulty.physicalActivity}
              label="Physical"
            />
            <DifficultyMeter
              score={template.difficulty.planningComplexity}
              label="Planning"
            />
          </div>
        )}

        <div className="bg-[var(--color-surface-offset)]/70 rounded-xl p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {isRoadTrip ? (
              <>
                <div>
                  <span className="text-[var(--color-text-faint)]">Fuel est.</span>
                  <div className="font-semibold text-sm">
                    {formatCurrency(cost.fuel || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)]">
                    Lodging est.
                  </span>
                  <div className="font-semibold text-sm">
                    {formatCurrency(cost.lodging)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[var(--color-text-faint)]">
                    Flights est.
                  </span>
                  <div className="font-semibold text-sm">
                    {formatCurrency(cost.flights || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)]">
                    Hotels est.
                  </span>
                  <div className="font-semibold text-sm">
                    {formatCurrency(cost.lodging)}
                  </div>
                </div>
              </>
            )}
            <div className="col-span-2 border-t border-[var(--color-border)] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Per person</span>
                <span className={`font-bold text-sm ${colors.accent}`}>
                  {formatCurrency(cost.perPerson)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          data-testid={`btn-view-${template.id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          View Itinerary <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
