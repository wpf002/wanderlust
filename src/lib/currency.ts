/**
 * Live exchange rates (the bundle's `ene`/`WL`/`tne`/`rne` helpers).
 *
 * Rates come from the free open.er-api.com endpoint and are cached in-memory
 * for one hour. On any failure `getExchangeRates` resolves to `null`, and the
 * conversion helpers fall back to displaying unconverted USD amounts.
 */

export interface ExchangeRates {
  base: "USD";
  rates: Record<string, number>;
  date: string;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

const cache: { data: ExchangeRates | null; fetched: number } = {
  data: null,
  fetched: 0,
};
const CACHE_TTL_MS = 1000 * 60 * 60;

export async function getExchangeRates(): Promise<ExchangeRates | null> {
  const now = Date.now();
  if (cache.data && now - cache.fetched < CACHE_TTL_MS) return cache.data;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("rate fetch failed");
    const json = (await res.json()) as {
      rates: Record<string, number>;
      time_last_update_utc?: string;
    };
    const data: ExchangeRates = {
      base: "USD",
      rates: json.rates,
      date:
        json.time_last_update_utc?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
    };
    cache.data = data;
    cache.fetched = now;
    return data;
  } catch {
    return null;
  }
}

/** Local currency for each trip template (the bundle's `WL`). */
export const tripCurrencies: Record<string, CurrencyInfo> = {
  route66: { code: "USD", symbol: "$", name: "US Dollar" },
  northern_parks: { code: "USD", symbol: "$", name: "US Dollar" },
  interstate: { code: "USD", symbol: "$", name: "US Dollar" },
  pacific_coast: { code: "USD", symbol: "$", name: "US Dollar" },
  gulf_coast: { code: "USD", symbol: "$", name: "US Dollar" },
  italy_west_coast: { code: "EUR", symbol: "€", name: "Euro" },
  scotland_ireland: { code: "GBP", symbol: "£", name: "British Pound" },
};

/** Convert a USD amount into `code`; returns the USD amount unchanged when rates are unavailable. */
export function convertFromUSD(
  amountUSD: number,
  code: string,
  rates: ExchangeRates | null,
): number {
  if (!rates || code === "USD") return amountUSD;
  const rate = rates.rates[code];
  return rate ? Math.round(amountUSD * rate) : amountUSD;
}

/** Format a converted amount with its currency symbol (the bundle's `rne`). */
export function formatConverted(
  amount: number,
  _code: string,
  symbol: string,
): string {
  return `${symbol}${amount.toLocaleString()}`;
}
