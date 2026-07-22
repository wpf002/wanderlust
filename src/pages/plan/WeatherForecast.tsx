import { Fragment, useEffect, useState } from "react";
import { Calendar, Droplets } from "lucide-react";
import {
  fetchCityForecast,
  weatherCodeInfo,
  type CityForecast,
} from "@/lib/weather";

interface WeatherForecastProps {
  cities: string[];
  departureDate?: string;
}

/**
 * Bundle `nU`: a tabbed multi-city forecast strip shown when a match card is
 * expanded. Lazily fetches (and caches) the forecast for the selected city via
 * the shared Open-Meteo helper.
 */
export default function WeatherForecast({
  cities,
  departureDate,
}: WeatherForecastProps) {
  const [cache, setCache] = useState<Record<string, CityForecast>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(cities[0] || "");

  useEffect(() => {
    if (cities.length !== 0) setSelected(cities[0]);
  }, [cities]);

  useEffect(() => {
    if (!selected || cache[selected]) return;
    setLoading(true);
    fetchCityForecast(selected, departureDate).then((forecast) => {
      setCache((prev) => ({ ...prev, [selected]: forecast }));
      setLoading(false);
    });
  }, [selected, departureDate, cache]);

  const current = cache[selected];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {cities.slice(0, 8).map((city) => {
          const short = city.split(",")[0];
          return (
            <button
              key={city}
              onClick={() => setSelected(city)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selected === city
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50"
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-[var(--color-text-muted)] text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mr-2" />
          Loading forecast…
        </div>
      )}

      {!loading && current?.error && (
        <p className="text-xs text-[var(--color-text-faint)] italic">
          {current.error}
        </p>
      )}

      {!loading && current && !current.error && (
        <Fragment>
          {departureDate && (
            <p className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
              <Calendar size={10} /> Forecast from{" "}
              {new Date(departureDate + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              )}
            </p>
          )}
          <div className="grid grid-cols-4 gap-1.5">
            {current.forecasts.slice(0, 7).map((day, i) => {
              const precipInches = Math.round(day.precipitation * 100) / 100;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center text-center bg-[var(--color-surface-offset)]/60 rounded-xl p-2 gap-0.5 min-w-0"
                >
                  <span className="text-xs text-[var(--color-text-faint)]">
                    {i === 0
                      ? "Today"
                      : new Date(day.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          { weekday: "short" },
                        )}
                  </span>
                  <span className="text-xl leading-none">
                    {weatherCodeInfo(day.weathercode).icon}
                  </span>
                  <span className="text-xs font-semibold">{day.tempMax}°</span>
                  <span className="text-xs text-[var(--color-text-faint)]">
                    {day.tempMin}°
                  </span>
                  {precipInches > 0.05 && (
                    <span className="text-xs text-blue-500 flex items-center gap-0.5">
                      <Droplets size={8} />
                      {precipInches}"
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[var(--color-text-faint)]">
            Source: Open-Meteo · {current.forecasts[0]?.date}
          </p>
        </Fragment>
      )}
    </div>
  );
}
