import { useState } from "react";
import { ChevronRight, ChevronUp, ChevronDown, CloudSun } from "lucide-react";
import type { Trip } from "@/data/types";
import { formatCurrency, type TripCostEstimate } from "@/lib/costs";
import WeatherForecast from "./WeatherForecast";

export interface ResultCardColors {
  accent: string;
  badge: string;
}

interface ResultCardProps {
  template: Trip;
  rank: number;
  costs: TripCostEstimate;
  colors: ResultCardColors;
  weatherCities: string[];
  forecastDate: string;
  travelMonth: string;
  onView: () => void;
}

/** Bundle `Vre`: a single trip-match card with an expandable weather strip. */
export default function ResultCard({
  template,
  rank,
  costs,
  colors,
  weatherCities,
  forecastDate,
  travelMonth,
  onView,
}: ResultCardProps) {
  const [weatherOpen, setWeatherOpen] = useState(false);

  return (
    <div
      data-testid={`result-${template.id}`}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-primary)]/40 transition-colors"
    >
      <div
        className="flex flex-col sm:flex-row gap-4 p-5 cursor-pointer group"
        onClick={onView}
      >
        {rank === 0 && (
          <div className="sm:absolute sm:-top-2 sm:left-4 mb-1 sm:mb-0">
            <span className="whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate border-transparent shadow-xs bg-[var(--color-primary)] text-white">
              Best Match
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 sm:w-10">
          <span className="text-3xl">{template.emoji}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-bold text-base">{template.name}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {template.subtitle}
              </p>
            </div>
            <div className="text-right">
              <div className={`font-bold text-lg ${colors.accent}`}>
                {formatCurrency(costs.perPerson)}
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  /person
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-faint)]">
                {template.totalDays} days
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {template.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full border ${colors.badge}`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-[var(--color-text-faint)]">
              Best time: {template.bestMonths}
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span className={`text-xs font-medium ${colors.accent}`}>
              {template.highlights.slice(0, 2).join(", ")}
            </span>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-colors whitespace-nowrap">
            View Itinerary <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {weatherCities.length > 0 && (
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={() => setWeatherOpen((open) => !open)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CloudSun size={12} className="text-[var(--color-primary)]" />
              {travelMonth} forecast for this route
            </span>
            {weatherOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {weatherOpen && (
            <div className="px-5 pb-4 pt-1">
              <WeatherForecast
                cities={weatherCities}
                departureDate={forecastDate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
