import { lookupCity } from "@/data/cityCoords";

export interface WeatherInfo {
  icon: string;
  description: string;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  weathercode: number;
}

export interface CityForecast {
  city: string;
  forecasts: DailyForecast[];
  error?: string;
}

/** Map an Open-Meteo WMO weather code to an icon + description. */
export function weatherCodeInfo(code: number): WeatherInfo {
  return code === 0
    ? { icon: "☀️", description: "Clear" }
    : code <= 2
      ? { icon: "⛅", description: "Partly cloudy" }
      : code === 3
        ? { icon: "☁️", description: "Overcast" }
        : code <= 49
          ? { icon: "🌫️", description: "Foggy" }
          : code <= 59
            ? { icon: "🌦️", description: "Drizzle" }
            : code <= 69
              ? { icon: "🌧️", description: "Rain" }
              : code <= 79
                ? { icon: "❄️", description: "Snow" }
                : code <= 84
                  ? { icon: "🌧️", description: "Rain showers" }
                  : code <= 94
                    ? { icon: "⛈️", description: "Thunderstorm" }
                    : { icon: "⛈️", description: "Severe storm" };
}

/** Fetch a 7-day forecast for a known city from Open-Meteo (free, no key). */
export async function fetchCityForecast(
  city: string,
  startDate?: string,
): Promise<CityForecast> {
  const coords = lookupCity(city);
  if (!coords) {
    return { city, forecasts: [], error: "City coordinates not available" };
  }
  try {
    const start = startDate
      ? startDate.split("T")[0]
      : new Date().toISOString().split("T")[0];
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split("T")[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&start_date=${start}&end_date=${endStr}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open-Meteo fetch failed");
    const data = await res.json();
    const daily = data.daily as {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      weathercode: number[];
    };
    const forecasts: DailyForecast[] = (daily?.time ?? []).map((date, i) => ({
      date,
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      precipitation: daily.precipitation_sum[i],
      weathercode: daily.weathercode[i],
    }));
    return { city, forecasts };
  } catch {
    return { city, forecasts: [], error: "Weather unavailable" };
  }
}
