import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Trash2,
  BedDouble,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  CloudSun,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  FileDown,
  Fuel,
  Landmark,
  Map as MapIcon,
  MapPin,
  Palette,
  Plane,
  Save,
  Settings2,
  Share2,
  Signpost,
  Snowflake,
  Star,
  Sun,
  Trees,
  TreePine,
  TrainFront,
  TriangleAlert,
  Droplets,
  Users,
  Utensils,
  Waves,
} from "lucide-react";
import type {
  Attraction,
  Hotel,
  RoadTripDay,
  Settings,
  Trip,
} from "@/data/types";
import { useTripsData } from "@/data/useTrips";
import { cityCoords, lookupCity } from "@/data/cityCoords";
import {
  estimateTripCosts,
  formatCurrency,
  nightlyHotelCost,
} from "@/lib/costs";
import {
  convertFromUSD,
  formatConverted,
  getExchangeRates,
  tripCurrencies,
  type ExchangeRates,
} from "@/lib/currency";
import { fetchCityForecast, weatherCodeInfo } from "@/lib/weather";
import { apiRequest } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Badge from "@/components/Badge";
import Slider from "@/components/Slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import type { RouteStop } from "@/components/RouteMap";

// Leaflet + leaflet.css ship in their own chunk, fetched only when the Map tab opens.
const RouteMap = lazy(() => import("@/components/RouteMap"));

/* ------------------------------------------------------------------ */
/* Local data types (fields the base Trip types don't declare verbatim) */
/* ------------------------------------------------------------------ */

interface ItinAttraction extends Attraction {
  entranceFee?: string;
}

interface FoodHighlight {
  name: string;
  description: string;
  priceRange?: string;
}

interface InternationalDay {
  day: number;
  location: string;
  from?: string | null;
  overnight?: string;
  travelMethod?: string;
  travelTime?: string;
  tips?: string;
  hotelPriceRange?: string;
  hotels?: Hotel[];
  attractions: ItinAttraction[];
  foodHighlights?: FoodHighlight[];
}

/* ------------------------------------------------------------------ */
/* Static data ported verbatim from the bundle                          */
/* ------------------------------------------------------------------ */

/** Bundle `Ic`: estimated gas price ($/gal) by US state. */
const GAS_PRICES_BY_STATE: Record<string, number> = {
  IL: 3.85,
  MO: 3.35,
  OK: 3.2,
  TX: 3.25,
  NM: 3.45,
  AZ: 3.65,
  CA: 4.8,
  WI: 3.6,
  MN: 3.55,
  SD: 3.4,
  WY: 3.3,
  UT: 3.5,
  NV: 3.75,
  CO: 3.55,
  IA: 3.3,
  OR: 4.2,
  WA: 4.4,
  KS: 3.25,
  MT: 3.45,
  ID: 3.4,
};

/** Bundle `Hne`: ordered state sequence per road-trip template. */
const STATE_SEQUENCES: Record<string, string[]> = {
  route66: ["IL", "MO", "KS", "OK", "TX", "NM", "AZ", "CA"],
  northern_parks: ["IL", "WI", "MN", "SD", "WY", "MT", "ID", "UT", "NV", "CA"],
  interstate: ["IL", "IA", "CO", "UT", "NV", "CA"],
  pacific_coast: ["CA", "OR", "WA"],
  gulf_coast: ["TX", "LA", "MS"],
};

/** Bundle `Gne`: map polyline/marker accent color (hex) by trip type. */
const MAP_ACCENT_HEX: Record<string, string> = {
  road_trip: "#d97706",
  international: "#3b82f6",
  beach: "#06b6d4",
  adventure: "#10b981",
};

interface CategoryStyle {
  icon: ReactNode;
  label: string;
  color: string;
}

/** Bundle `EP`: attraction category icon/label/color styles. */
const ATTRACTION_CATEGORIES: Record<string, CategoryStyle> = {
  history: {
    icon: <Landmark size={11} />,
    label: "History",
    color:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  },
  nature: {
    icon: <Trees size={11} />,
    label: "Nature",
    color:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  },
  roadside: {
    icon: <Signpost size={11} />,
    label: "Roadside",
    color:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40",
  },
  museum: {
    icon: <BookOpen size={11} />,
    label: "Museum",
    color:
      "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40",
  },
  park: {
    icon: <TreePine size={11} />,
    label: "Park",
    color:
      "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/40",
  },
  art: {
    icon: <Palette size={11} />,
    label: "Art",
    color:
      "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/40",
  },
  food: {
    icon: <Utensils size={11} />,
    label: "Food",
    color:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/40",
  },
  beach: {
    icon: <Waves size={11} />,
    label: "Beach",
    color:
      "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40",
  },
  architecture: {
    icon: <Building2 size={11} />,
    label: "Architecture",
    color:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40",
  },
  activity: {
    icon: <Activity size={11} />,
    label: "Activity",
    color:
      "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-500/20 dark:text-lime-300 dark:border-lime-500/40",
  },
};

/** Bundle `zne`: leading icon for an international day's travel method. */
const TRAVEL_METHOD_ICONS: Record<string, ReactNode> = {
  car: <Car size={13} />,
  train: <TrainFront size={13} />,
  flight: <Plane size={13} />,
  ferry: <Waves size={13} />,
  mixed: <ArrowRight size={13} />,
};

type Severity = "good" | "warn" | "bad";
interface SeasonalTip {
  month: number[];
  tip: string;
  icon: ReactNode;
  severity: Severity;
}

/** Bundle `Zne` data: month-keyed seasonal tips per template. */
const SEASONAL_TIPS: Record<string, SeasonalTip[]> = {
  route66: [
    {
      month: [5, 6, 7],
      tip: "Hot through NM, AZ, TX in summer — pack sunscreen & extra water.",
      icon: <Sun size={13} />,
      severity: "warn",
    },
    {
      month: [8, 9, 10],
      tip: "Mild fall weather — ideal for all sections of Route 66.",
      icon: <CircleCheck size={13} />,
      severity: "good",
    },
    {
      month: [11, 0, 1],
      tip: "Mountain passes (NM/AZ) may have snow. Check road conditions.",
      icon: <Snowflake size={13} />,
      severity: "warn",
    },
  ],
  northern_parks: [
    {
      month: [5, 6, 7],
      tip: "Peak Yellowstone season — crowds high, book lodging 6 months out.",
      icon: <TriangleAlert size={13} />,
      severity: "warn",
    },
    {
      month: [8, 9],
      tip: "Best for Northern Parks — shoulder season, great weather, fewer crowds.",
      icon: <CircleCheck size={13} />,
      severity: "good",
    },
    {
      month: [10, 11, 0],
      tip: "Yellowstone roads close Nov–Apr. Check NPS.gov before traveling.",
      icon: <TriangleAlert size={13} />,
      severity: "bad",
    },
  ],
  pacific_coast: [
    {
      month: [5, 6, 7, 8],
      tip: "Coastal fog common in Northern CA. Layer up even in summer.",
      icon: <Snowflake size={13} />,
      severity: "warn",
    },
    {
      month: [9, 10],
      tip: "September–October: warmest, clearest days on the PCH. Ideal timing.",
      icon: <CircleCheck size={13} />,
      severity: "good",
    },
    {
      month: [11, 0, 1, 2],
      tip: "Winter storms possible on CA/OR coast. Some stretches may close.",
      icon: <Droplets size={13} />,
      severity: "warn",
    },
  ],
  italy_west_coast: [
    {
      month: [5, 6, 7],
      tip: "Peak summer in Italy — very hot on Amalfi Coast. Book restaurants ahead.",
      icon: <Sun size={13} />,
      severity: "warn",
    },
    {
      month: [8, 9, 10],
      tip: "Late September is ideal — warm, fewer tourists, great food season.",
      icon: <CircleCheck size={13} />,
      severity: "good",
    },
    {
      month: [11, 0, 1],
      tip: "Off-season: cooler, cheaper, but some coastal attractions close.",
      icon: <Snowflake size={13} />,
      severity: "warn",
    },
  ],
  scotland_ireland: [
    {
      month: [5, 6, 7],
      tip: "June–July best for long daylight hours (up to 18h in Scotland).",
      icon: <CircleCheck size={13} />,
      severity: "good",
    },
    {
      month: [10, 11, 0, 1, 2, 3],
      tip: "Rain and wind likely — pack waterproof layers regardless of month.",
      icon: <Droplets size={13} />,
      severity: "warn",
    },
  ],
  gulf_coast: [
    {
      month: [5, 6, 7, 8, 9],
      tip: "Hurricane season — monitor forecasts closely June–November.",
      icon: <TriangleAlert size={13} />,
      severity: "bad",
    },
    {
      month: [10, 11, 0, 1, 2, 3],
      tip: "Winter/spring best for Gulf Coast — warm, dry, comfortable.",
      icon: <CircleCheck size={13} />,
      severity: "good",
    },
  ],
  interstate: [
    {
      month: [11, 0, 1, 2],
      tip: "Rockies (CO/UT) can have heavy snow — check I-70 pass conditions.",
      icon: <Snowflake size={13} />,
      severity: "warn",
    },
    {
      month: [5, 6, 7, 8],
      tip: "Summer: watch for desert heat crossing Nevada (100°F+ in Vegas).",
      icon: <Sun size={13} />,
      severity: "warn",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Small shared UI helpers                                              */
/* ------------------------------------------------------------------ */

/** Bundle `NU`: horizontal drive-hours meter with a colored fill. */
function DriveHoursMeter({
  hours,
  max = 7,
  label,
}: {
  hours: number;
  max?: number;
  label?: string;
}) {
  const pct = Math.min((hours / max) * 100, 100);
  const color =
    hours <= 3 ? "bg-emerald-500" : hours <= 5.5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[var(--color-text-muted)] w-20 text-right shrink-0">
        {label ?? `${hours}h ${hours > 0 ? "travel" : ""}`}
      </span>
    </div>
  );
}

/**
 * Parse a free-form travel-time string into decimal hours. International legs
 * store prose like "~1h30m (Frecciarossa)", "2 hours 30 minutes", or "30 min",
 * so we extract the first duration we can recognize. Returns null when nothing
 * parses (and 0 for "N/A"/same-area days).
 */
function parseTravelHours(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/n\/?a|staying|same area/.test(s)) return 0;
  // "1h30m", "1 h 30 m", "2 hours 30 minutes", "3 hours"
  const hm = s.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\s*(?:(\d+)\s*m)?/);
  if (hm) return parseFloat(hm[1]) + (hm[2] ? parseInt(hm[2], 10) / 60 : 0);
  // "30 minutes", "40 min"
  const min = s.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?\b/);
  if (min) return parseFloat(min[1]) / 60;
  if (/^\s*0\s*$/.test(s)) return 0;
  return null;
}

/** Format decimal hours as a compact label, rolling into days past 24h. */
function formatTravelDuration(hours: number): string {
  if (hours <= 0) return "Same area";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rem = Math.round(hours % 24);
    return rem ? `${days}d ${rem}h` : `${days}d`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Bundle `Vne`: booking.com search URL for a hotel name + city. */
function bookingSearchUrl(hotelName: string, city: string): string {
  return `https://www.booking.com/search.html?ss=${encodeURIComponent(
    `${hotelName} ${city}`,
  )}`;
}

/** Bundle `RU`: "Must-See" attractions list inside a day card. */
function AttractionsList({ attractions }: { attractions: ItinAttraction[] }) {
  return (
    <div className="p-4">
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <Star size={11} /> Must-See
      </h4>
      <div className="space-y-2.5">
        {attractions.map((attraction, i) => {
          const category =
            ATTRACTION_CATEGORIES[attraction.category ?? ""] ||
            ATTRACTION_CATEGORIES.history;
          return (
            <div
              key={i}
              className="p-3 rounded-xl bg-[var(--color-surface-offset)]/50"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-sm">{attraction.name}</span>
                <Badge
                  className={`${category.color} border text-xs py-0 px-1.5 flex items-center gap-1`}
                >
                  {category.icon} {category.label}
                </Badge>
                {attraction.entranceFee && (
                  <span className="text-xs text-[var(--color-text-faint)]">
                    {attraction.entranceFee}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-1">
                {attraction.description}
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-faint)]">
                  <Clock size={10} /> {attraction.hours}
                </div>
                {attraction.bookingUrl && (
                  <a
                    href={attraction.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Reserve
                  </a>
                )}
              </div>
              {attraction.location && (
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-faint)] mt-0.5">
                  <MapPin size={10} /> {attraction.location}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Bundle `IU`: overnight-stay hotel list inside a day card. */
function HotelsList({
  hotels,
  overnight,
  nightCost,
  settings,
  badge,
}: {
  hotels: Hotel[];
  overnight: string;
  nightCost: number;
  settings: Settings;
  badge: string;
}) {
  const priceColor = badge.includes("amber")
    ? "text-amber-600 dark:text-amber-400"
    : badge.includes("blue")
      ? "text-blue-600 dark:text-blue-400"
      : "text-emerald-600 dark:text-emerald-400";
  const rooms = Math.ceil(settings.travelers / 2);
  return (
    <div className="p-4">
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <BedDouble size={11} /> Stay — {overnight}
      </h4>
      <div className="space-y-2">
        {hotels.map((hotel, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[var(--color-surface-offset)]/50"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{hotel.name}</div>
              {hotel.notes && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {hotel.notes}
                </p>
              )}
              {hotel.location && (
                <p className="text-xs text-[var(--color-text-faint)] mt-0.5 flex items-center gap-1">
                  <MapPin size={9} />
                  {hotel.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-sm font-semibold ${priceColor}`}>
                {hotel.priceRange}
              </span>
              <a
                href={bookingSearchUrl(hotel.name, overnight)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                data-testid={`book-hotel-${i}`}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors whitespace-nowrap"
              >
                Book It <ExternalLink size={10} />
              </a>
            </div>
          </div>
        ))}
      </div>
      {nightCost > 0 && (
        <p className="mt-2 text-xs text-[var(--color-text-faint)]">
          Est. ({settings.budget}, {rooms} room{rooms > 1 ? "s" : ""}):{" "}
          <strong className="text-[var(--color-text-muted)]">
            {formatCurrency(nightCost)}/night
          </strong>
        </p>
      )}
    </div>
  );
}

/** Editable per-day notes block (shared by both day-card variants). */
function DayNotesEditor({
  day,
  testId,
  dayNote,
  onSaveNote,
}: {
  day: number;
  testId: string;
  dayNote?: string;
  onSaveNote: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(dayNote || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setText(dayNote || "");
  }, [dayNote]);
  return (
    <div className="p-4">
      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <BookOpen size={11} /> Day Notes
      </h4>
      <textarea
        data-testid={testId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add personal notes for this day…"
        rows={3}
        className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
      />
      <button
        onClick={async () => {
          setSaving(true);
          await onSaveNote(text);
          setSaving(false);
        }}
        disabled={saving}
        className="mt-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save note"}
      </button>
    </div>
  );
}

interface DayCardCommonProps {
  accent: string;
  badge: string;
  settings: Settings;
  isLast: boolean;
  actualDate?: string;
  dayNote?: string;
  onSaveNote: (text: string) => Promise<void>;
}

function formatActualDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Bundle `qne`: expandable card for a US road-trip day (from → to). */
function RoadTripDayCard({
  day,
  accent,
  badge,
  settings,
  isLast,
  actualDate,
  dayNote,
  onSaveNote,
}: DayCardCommonProps & { day: RoadTripDay }) {
  const [open, setOpen] = useState(false);
  const rooms = Math.ceil(settings.travelers / 2);
  const nightCost = isLast
    ? 0
    : nightlyHotelCost(day.hotelPriceRange, settings.budget) * rooms;
  return (
    <div
      data-testid={`day-${day.day}`}
      className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]"
    >
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--color-surface-offset)]/40 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${accent} bg-[var(--color-surface-offset)]`}
        >
          {day.day}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold flex-wrap">
            <span>{day.from.split(",")[0]}</span>
            <ArrowRight
              size={11}
              className="text-[var(--color-text-faint)] shrink-0"
            />
            <span>{day.to.split(",")[0]}</span>
          </div>
          {actualDate && (
            <div className="text-xs text-[var(--color-text-faint)] mt-0.5">
              {formatActualDate(actualDate)}
            </div>
          )}
          <div className="mt-1">
            <DriveHoursMeter hours={day.driveHours} />
          </div>
        </div>
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-sm font-bold">{day.miles} mi</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {day.attractions.length} stops
          </div>
        </div>
        {open ? (
          <ChevronUp size={15} className="text-[var(--color-text-muted)] shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-[var(--color-text-muted)] shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-divider)]">
          <AttractionsList attractions={day.attractions as ItinAttraction[]} />
          <HotelsList
            hotels={day.hotels}
            overnight={day.overnight}
            nightCost={nightCost}
            settings={settings}
            badge={badge}
          />
          <DayNotesEditor
            day={day.day}
            testId={`day-note-${day.day}`}
            dayNote={dayNote}
            onSaveNote={onSaveNote}
          />
        </div>
      )}
    </div>
  );
}

/** Bundle `Wne`: expandable card for an international day (location-based). */
function InternationalDayCard({
  day,
  accent,
  badge,
  settings,
  isLast,
  actualDate,
  dayNote,
  onSaveNote,
}: DayCardCommonProps & { day: InternationalDay }) {
  const [open, setOpen] = useState(false);
  const rooms = Math.ceil(settings.travelers / 2);
  const nightCost = isLast
    ? 0
    : nightlyHotelCost(day.hotelPriceRange, settings.budget) * rooms;
  const travelHours = parseTravelHours(day.travelTime);
  return (
    <div
      data-testid={`day-${day.day}`}
      className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]"
    >
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--color-surface-offset)]/40 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${accent} bg-[var(--color-surface-offset)]`}
        >
          {day.day}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{day.location}</div>
          {actualDate && (
            <div className="text-xs text-[var(--color-text-faint)] mt-0.5">
              {formatActualDate(actualDate)}
            </div>
          )}
          {day.from && (
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
              {day.travelMethod && TRAVEL_METHOD_ICONS[day.travelMethod.split(" ")[0]]}
              <span>{day.from}</span>
            </div>
          )}
          {travelHours != null && travelHours > 0 && (
            <DriveHoursMeter
              hours={travelHours}
              label={`${formatTravelDuration(travelHours)} travel`}
            />
          )}
        </div>
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-xs text-[var(--color-text-muted)]">
            {day.attractions.length} sites
          </div>
          {day.travelMethod && (
            <div className="text-xs text-[var(--color-text-faint)] capitalize">
              {day.travelMethod}
            </div>
          )}
        </div>
        {open ? (
          <ChevronUp size={15} className="text-[var(--color-text-muted)] shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-[var(--color-text-muted)] shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-divider)]">
          <AttractionsList attractions={day.attractions} />
          {day.foodHighlights && day.foodHighlights.length > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Utensils size={11} /> Food & Drink
              </h4>
              <div className="space-y-2">
                {day.foodHighlights.map((food, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[var(--color-surface-offset)]/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{food.name}</div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {food.description}
                      </p>
                    </div>
                    {food.priceRange && (
                      <span className="text-xs font-medium text-[var(--color-text-muted)] shrink-0">
                        {food.priceRange}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {day.tips && (
            <div className="p-4">
              <p className="text-xs text-[var(--color-text-muted)] italic">
                💡 {day.tips}
              </p>
            </div>
          )}
          <HotelsList
            hotels={day.hotels || []}
            overnight={day.overnight || day.location}
            nightCost={nightCost}
            settings={settings}
            badge={badge}
          />
          <DayNotesEditor
            day={day.day}
            testId={`day-note-intl-${day.day}`}
            dayNote={dayNote}
            onSaveNote={onSaveNote}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar / tab-panel sections                                         */
/* ------------------------------------------------------------------ */

/** Bundle `Yne`: fuel-stop planner (road trips only). */
function FuelPlanner({ template, settings }: { template: Trip; settings: Settings }) {
  const mpg = settings.mpg || 28;
  const tankGallons = 15;
  const rangePerTank = mpg * tankGallons;
  const states = STATE_SEQUENCES[template.id] || [];
  const days = template.roadTripDays || [];

  interface DayStrategy {
    day: number;
    from: string;
    to: string;
    miles: number;
    milesSoFar: number;
    state: string;
    gasPricePerGal: number;
    gallons: number;
    cost: number;
    recommendation: "fill_up" | "skip" | "top_off";
    reason: string;
  }

  const strategies: DayStrategy[] = [];
  let milesSinceFill = 0;
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const nextState = states[Math.min(i + 1, states.length - 1)] || states[states.length - 1];
    const currentState = states[Math.min(i, states.length - 1)] || states[0];
    const currentPrice = GAS_PRICES_BY_STATE[currentState] || 3.85;
    const nextPrice = nextState ? GAS_PRICES_BY_STATE[nextState] || 3.85 : currentPrice;
    milesSinceFill += day.miles;
    const gallons = day.miles / mpg;
    const cost = gallons * currentPrice;
    let recommendation: DayStrategy["recommendation"] = "fill_up";
    let reason = "";
    if (milesSinceFill > rangePerTank * 0.85) {
      recommendation = "fill_up";
      reason = `Tank getting low (${milesSinceFill.toFixed(0)} miles since last fill)`;
      milesSinceFill = 0;
    } else if (currentPrice < nextPrice - 0.2) {
      recommendation = "fill_up";
      reason = `Cheaper here than next state ($${currentPrice.toFixed(2)} vs $${nextPrice.toFixed(2)}/gal)`;
      milesSinceFill = 0;
    } else if (currentPrice > nextPrice + 0.2) {
      recommendation = "skip";
      reason = `Cheaper gas ahead in ${nextState} ($${nextPrice.toFixed(2)}/gal)`;
    } else {
      recommendation = "top_off";
      reason = "Prices similar — top off if below half tank";
    }
    strategies.push({
      day: day.day,
      from: day.from.split(",")[0],
      to: day.to.split(",")[0],
      miles: day.miles,
      milesSoFar: milesSinceFill,
      state: currentState,
      gasPricePerGal: currentPrice,
      gallons,
      cost,
      recommendation,
      reason,
    });
  }
  const totalGallons = days.reduce((sum, d) => sum + d.miles / mpg, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {totalGallons.toFixed(0)}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">Total Gallons</div>
        </div>
        <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {rangePerTank.toFixed(0)} mi
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">Range/Tank</div>
          <div className="text-xs text-[var(--color-text-faint)]">
            {mpg} MPG × {tankGallons}gal
          </div>
        </div>
        <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
          <div className="text-lg font-bold">
            {strategies.filter((s) => s.recommendation === "fill_up").length}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">Fill-ups</div>
        </div>
      </div>

      {states.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Gas Prices by State
          </div>
          <div className="space-y-1">
            {states.map((state) => {
              const price = GAS_PRICES_BY_STATE[state] || 3.85;
              const min = Math.min(...states.map((s) => GAS_PRICES_BY_STATE[s] || 3.85));
              const max = Math.max(...states.map((s) => GAS_PRICES_BY_STATE[s] || 3.85));
              const pct = max > min ? ((price - min) / (max - min)) * 100 : 50;
              const isMin = price === min;
              const isMax = price === max;
              return (
                <div key={state} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-8 shrink-0">{state}</span>
                  <div className="flex-1 h-2 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isMin ? "bg-emerald-500" : isMax ? "bg-red-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium w-12 text-right shrink-0 ${isMin ? "text-emerald-600 dark:text-emerald-400" : isMax ? "text-red-600 dark:text-red-400" : "text-[var(--color-text-muted)]"}`}
                  >
                    ${price.toFixed(2)}
                  </span>
                  {isMin && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                      Best
                    </span>
                  )}
                  {isMax && (
                    <span className="text-xs text-red-600 dark:text-red-400 shrink-0">
                      Priciest
                    </span>
                  )}
                  <a
                    href={`https://www.gasbuddy.com/go/${state.toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-faint)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    GasBuddy
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Day-by-Day Strategy
        </div>
        <div className="space-y-2">
          {strategies.map((s) => (
            <div
              key={s.day}
              className={`p-3 rounded-xl border ${
                s.recommendation === "fill_up"
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"
                  : s.recommendation === "skip"
                    ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
                    : "bg-[var(--color-surface-offset)] border-[var(--color-border)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-0.5">
                    {s.recommendation === "fill_up" && (
                      <CircleCheck size={12} className="text-emerald-500 shrink-0" />
                    )}
                    {s.recommendation === "skip" && (
                      <TriangleAlert size={12} className="text-amber-500 shrink-0" />
                    )}
                    {s.recommendation === "top_off" && (
                      <Droplets size={12} className="text-blue-500 shrink-0" />
                    )}
                    <span>
                      Day {s.day}: {s.from} → {s.to}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{s.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold">
                    ${s.gasPricePerGal.toFixed(2)}/gal
                  </div>
                  <div className="text-xs text-[var(--color-text-faint)]">
                    {s.miles} mi
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-faint)] italic">
        Fuel prices are estimates. Check{" "}
        <a
          href="https://www.gasbuddy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] underline"
        >
          GasBuddy
        </a>{" "}
        for real-time prices before filling up.
      </p>
    </div>
  );
}

/** Bundle `Kne`: cost breakdown card with optional currency conversion. */
function CostBreakdown({
  template,
  settings,
  rates,
  currencyCode,
  currencySymbol,
}: {
  template: Trip;
  settings: Settings;
  rates: ExchangeRates | null;
  currencyCode: string;
  currencySymbol: string;
}) {
  const est = estimateTripCosts(template, settings);
  const isRoadTrip = !!template.roadTripDays;
  const accent =
    template.type === "road_trip"
      ? "text-amber-600 dark:text-amber-400"
      : "text-blue-600 dark:text-blue-400";
  const money = (amountUSD: number) =>
    formatConverted(
      Math.round(convertFromUSD(amountUSD, currencyCode, rates)),
      currencyCode,
      currencySymbol,
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {isRoadTrip ? (
          <>
            <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${accent}`}>{money(est.fuel || 0)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Fuel</div>
              <div className="text-xs text-[var(--color-text-faint)]">
                {(est.gallons || 0).toFixed(0)} gal @ ${settings.gasPrice}
              </div>
            </div>
            <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${accent}`}>{money(est.lodging)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Lodging</div>
              <div className="text-xs text-[var(--color-text-faint)]">
                {template.totalDays - 1} nights
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${accent}`}>{money(est.flights || 0)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Flights</div>
              <div className="text-xs text-[var(--color-text-faint)]">
                {settings.travelers} traveler{settings.travelers > 1 ? "s" : ""} R/T
              </div>
            </div>
            <div className="bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${accent}`}>{money(est.lodging)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Hotels</div>
              <div className="text-xs text-[var(--color-text-faint)]">
                {template.totalDays - 1} nights
              </div>
            </div>
          </>
        )}
        <div className="col-span-2 bg-[var(--color-surface-offset)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">{money(est.total)}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Total Trip Cost</div>
          <div className={`text-base font-semibold ${accent} mt-0.5`}>
            {money(est.perPerson)}{" "}
            <span className="text-xs font-normal text-[var(--color-text-faint)]">
              / person
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Daily Budget Reference
        </div>
        {Object.entries(template.dailyBudgets).map(([tier, budget]) => (
          <div
            key={tier}
            className={`p-2.5 rounded-lg mb-1.5 border ${settings.budget === tier ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-transparent"}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${settings.budget === tier ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}
              >
                {budget.label}
              </span>
              <span
                className={`text-xs font-bold ${settings.budget === tier ? accent : "text-[var(--color-text-muted)]"}`}
              >
                {money(budget.perPersonPerDay)}/day
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-faint)] mt-0.5">
              {budget.includes}
            </p>
          </div>
        ))}
      </div>

      {isRoadTrip && template.roadTripDays && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Daily Fuel
          </div>
          <div className="space-y-1">
            {template.roadTripDays.map((day) => {
              const fuel = (day.miles / (settings.mpg || 28)) * (settings.gasPrice || 3.85);
              return (
                <div
                  key={day.day}
                  className="flex justify-between text-xs py-1 border-b border-[var(--color-divider)] last:border-0"
                >
                  <span className="text-[var(--color-text-muted)]">
                    Day {day.day}: {day.from.split(",")[0]} → {day.to.split(",")[0]}
                  </span>
                  <div className="flex gap-3">
                    <span className="text-[var(--color-text-faint)]">{day.miles}mi</span>
                    <span className="font-medium">{money(fuel)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isRoadTrip && template.flightEstimate && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Flight Estimates (R/T per person)
          </div>
          {Object.entries(template.flightEstimate).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between text-xs py-1.5 border-b border-[var(--color-divider)] last:border-0"
            >
              <span className="text-[var(--color-text-muted)] capitalize">
                {key.replace("from", "From ")}
              </span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bundle `Xne`: personalize-estimates settings (travelers/budget/mpg/gas/flight). */
function PersonalizeSettings({
  template,
  settings,
  setSettings,
}: {
  template: Trip;
  settings: Settings;
  setSettings: (s: Settings) => void;
}) {
  const isRoadTrip = !!template.roadTripDays;
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
          <span className="flex items-center gap-1">
            <Users size={11} /> Travelers
          </span>
          <span className="font-bold text-[var(--color-text)]">{settings.travelers}</span>
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
          Budget Tier
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

      {isRoadTrip ? (
        <>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
              <span className="flex items-center gap-1">
                <Settings2 size={11} /> MPG
              </span>
              <span className="font-bold text-[var(--color-text)]">{settings.mpg}</span>
            </label>
            <Slider
              min={10}
              max={60}
              step={1}
              value={[settings.mpg || 28]}
              onValueChange={([v]) => setSettings({ ...settings, mpg: v })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
              <span className="flex items-center gap-1">
                <Fuel size={11} /> Gas $/gal
              </span>
              <span className="font-bold text-[var(--color-text)]">
                ${(settings.gasPrice || 3.85).toFixed(2)}
              </span>
            </label>
            <Slider
              min={2.5}
              max={6}
              step={0.05}
              value={[settings.gasPrice || 3.85]}
              onValueChange={([v]) =>
                setSettings({ ...settings, gasPrice: Math.round(v * 100) / 100 })
              }
            />
          </div>
        </>
      ) : (
        <div>
          <label className="text-xs text-[var(--color-text-muted)] flex justify-between mb-1.5">
            <span className="flex items-center gap-1">
              <Plane size={11} /> Flight cost/person
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
          {template.flightEstimate?.fromChicago && (
            <p className="text-xs text-[var(--color-text-faint)] mt-1.5">
              Chicago: {template.flightEstimate.fromChicago}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Bundle `Zne`: seasonal-tips list under the weather tab. */
function SeasonalTips({ templateId }: { templateId: string }) {
  const month = new Date().getMonth();
  const all = SEASONAL_TIPS[templateId] || [];
  const forMonth = all.filter((t) => t.month.includes(month));
  const tips = forMonth.length > 0 ? forMonth : all.slice(0, 2);
  if (tips.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Seasonal Tips
      </div>
      {tips.map((tip, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
            tip.severity === "good"
              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : tip.severity === "bad"
                ? "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30 text-red-800 dark:text-red-300"
                : "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 text-amber-800 dark:text-amber-300"
          }`}
        >
          <span className="shrink-0 mt-0.5">{tip.icon}</span>
          <span>{tip.tip}</span>
        </div>
      ))}
    </div>
  );
}

interface StopForecast {
  icon: string;
  date: string;
  tempHighF: number;
  tempLowF: number;
  precipInches: number;
}

/** Bundle `nU`: 7-day forecast per overnight stop, with a city selector. */
function WeatherForecast({
  cities,
  departureDate,
}: {
  cities: string[];
  departureDate?: string;
}) {
  const [cache, setCache] = useState<Record<string, StopForecast[] | { error: string }>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(cities[0] || "");

  useEffect(() => {
    if (cities.length !== 0) setSelected(cities[0]);
  }, [cities]);

  useEffect(() => {
    if (!selected || cache[selected]) return;
    setLoading(true);
    fetchCityForecast(selected, departureDate).then((result) => {
      const value = result.error
        ? { error: result.error }
        : result.forecasts.map((f) => ({
            icon: weatherCodeInfo(f.weathercode).icon,
            date: f.date,
            tempHighF: f.tempMax,
            tempLowF: f.tempMin,
            precipInches: f.precipitation,
          }));
      setCache((prev) => ({ ...prev, [selected]: value }));
      setLoading(false);
    });
  }, [selected, departureDate, cache]);

  const current = cache[selected];
  const error = current && "error" in current ? current.error : undefined;
  const forecasts = current && !("error" in current) ? current : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {cities.slice(0, 8).map((city) => (
          <button
            key={city}
            onClick={() => setSelected(city)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected === city ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50"}`}
          >
            {city.split(/[,—+(]/)[0].trim()}
          </button>
        ))}
      </div>
      {loading && (
        <div className="flex items-center justify-center h-24 text-[var(--color-text-muted)] text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mr-2" />
          Loading forecast…
        </div>
      )}
      {!loading && error && (
        <p className="text-xs text-[var(--color-text-faint)] italic">{error}</p>
      )}
      {!loading && forecasts && (
        <>
          {departureDate && (
            <p className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
              <CalendarDays size={10} /> Forecast from{" "}
              {new Date(departureDate + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          <div className="grid grid-cols-4 gap-1.5">
            {forecasts.slice(0, 7).map((f, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center bg-[var(--color-surface-offset)]/60 rounded-xl p-2 gap-0.5 min-w-0"
              >
                <span className="text-xs text-[var(--color-text-faint)]">
                  {i === 0
                    ? "Today"
                    : new Date(f.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                      })}
                </span>
                <span className="text-xl leading-none">{f.icon}</span>
                <span className="text-xs font-semibold">{f.tempHighF}°</span>
                <span className="text-xs text-[var(--color-text-faint)]">{f.tempLowF}°</span>
                {f.precipInches >= 0.05 && (
                  <span className="text-xs text-blue-500 flex items-center gap-0.5">
                    <Droplets size={8} />
                    {f.precipInches.toFixed(2)}"
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-faint)]">
            Source: Open-Meteo · {forecasts[0]?.date}
          </p>
        </>
      )}
    </div>
  );
}

/** Bundle `Qne`: print-ready itinerary export (opens a print window). */
function ExportItinerary({ template, settings }: { template: Trip; settings: Settings }) {
  const est = estimateTripCosts(template, settings);
  const isRoadTrip = !!template.roadTripDays;
  const days: Array<RoadTripDay | InternationalDay> =
    template.roadTripDays || (template.tripDays as unknown as InternationalDay[]) || [];

  function exportItinerary() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${template.name} — Wanderlust Planner</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; line-height: 1.5; }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
    h3 { font-size: 12px; font-weight: 700; margin: 12px 0 4px; color: #555; }
    .subtitle { color: #666; margin-bottom: 16px; font-size: 13px; }
    .meta { display: flex; gap: 24px; margin-bottom: 16px; }
    .meta-item { text-align: center; }
    .meta-item strong { display: block; font-size: 16px; font-weight: 800; color: #b45309; }
    .meta-item span { font-size: 10px; color: #888; }
    .cost-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
    .cost-total { font-weight: 800; font-size: 16px; color: #b45309; }
    .day { margin-bottom: 14px; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; }
    .day-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
    .attraction { padding: 4px 0; color: #444; }
    .attr-name { font-weight: 600; }
    .hotel { margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; }
    .footer { margin-top: 32px; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${template.emoji} ${template.name}</h1>
  <p class="subtitle">${template.subtitle}</p>

  <div class="meta">
    <div class="meta-item"><strong>${template.totalDays}</strong><span>Days</span></div>
    ${isRoadTrip ? `<div class="meta-item"><strong>${template.roadTripDays?.reduce((sum, d) => sum + d.miles, 0).toLocaleString() || 0}</strong><span>Miles</span></div>` : ""}
    <div class="meta-item"><strong>${settings.travelers}</strong><span>Travelers</span></div>
    <div class="meta-item"><strong>$${est.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong><span>Total Cost</span></div>
    <div class="meta-item"><strong>$${est.perPerson.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong><span>Per Person</span></div>
  </div>

  <h2>Cost Breakdown</h2>
  ${
    isRoadTrip
      ? `
  <div class="cost-row"><span>Fuel (${(est.gallons || 0).toFixed(0)} gal @ $${settings.gasPrice})</span><span>$${(est.fuel || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>
  `
      : `
  <div class="cost-row"><span>Flights (${settings.travelers}x R/T)</span><span>$${(est.flights || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>
  `
  }
  <div class="cost-row"><span>Lodging (${template.totalDays - 1} nights)</span><span>$${est.lodging.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>
  <div class="cost-row"><span>Activities & Food</span><span>$${(est.total - (est.fuel || 0) - (est.flights || 0) - est.lodging).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>
  <div class="cost-row" style="border-bottom:none; font-weight:700;"><span>Total</span><span class="cost-total">$${est.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>

  <h2>Day-by-Day Itinerary</h2>
  ${days
    .map((day) => {
      const isRoad = "from" in day && "miles" in day;
      const roadDay = isRoad ? (day as RoadTripDay) : null;
      const intlDay = isRoad ? null : (day as InternationalDay);
      return `
    <div class="day">
      <div class="day-title">
        Day ${day.day}: ${roadDay ? `${roadDay.from.split(",")[0]} → ${roadDay.to.split(",")[0]} (${roadDay.miles} mi)` : intlDay?.location || ""}
      </div>
      ${day.attractions
        .slice(0, 5)
        .map(
          (a) => `
        <div class="attraction"><span class="attr-name">${a.name}</span> — ${a.description.substring(0, 80)}${a.description.length > 80 ? "…" : ""}</div>
      `,
        )
        .join("")}
      ${
        roadDay
          ? `
      <div class="hotel">Stay: ${roadDay.overnight} — ${roadDay.hotels[0]?.name || "Hotel"} (${roadDay.hotels[0]?.priceRange || ""})</div>
      `
          : intlDay
            ? `
      <div class="hotel">Stay: ${intlDay.overnight || intlDay.location} — ${intlDay.hotels?.[0]?.name || ""}</div>
      `
            : ""
      }
    </div>
    `;
    })
    .join("")}

  <div class="footer">
    Generated by Wanderlust Planner · ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }

  const totalAttractions = days.reduce((sum, d) => sum + d.attractions.length, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Export a print-ready itinerary with your day-by-day plan, cost breakdown, and
        hotel details.
      </p>
      <div className="bg-[var(--color-surface-offset)] rounded-xl p-4 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Days covered</span>
          <span className="font-medium">{template.totalDays}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Attractions listed</span>
          <span className="font-medium">{totalAttractions}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Total cost included</span>
          <span className="font-medium">{formatCurrency(est.total)}</span>
        </div>
      </div>
      <button
        data-testid="pdf-export-btn"
        onClick={exportItinerary}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        <FileDown size={14} /> Export / Print Itinerary
      </button>
      <p className="text-xs text-[var(--color-text-faint)] text-center">
        Opens a print dialog — save as PDF from your browser
      </p>
    </div>
  );
}

/** Bundle `Qre`: save the current settings and get shareable links. */
function ShareTrip({
  templateId,
  templateName,
  settings,
}: {
  templateId: string;
  templateName: string;
  settings: Settings;
}) {
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<{ viewUrl: string; editUrl?: string } | null>(null);
  const [copied, setCopied] = useState<"view" | "edit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest("POST", "/api/trips/save", {
        templateId,
        templateName,
        settings,
        isEditable: mode === "edit",
      });
      const data = (await res.json()) as { slug?: string; editSlug?: string };
      if (!data.slug) throw new Error("No slug returned");
      const base = window.location.origin;
      setLinks({
        viewUrl: `${base}/shared/${data.slug}`,
        editUrl: data.editSlug ? `${base}/edit/${data.editSlug}` : undefined,
      });
    } catch {
      setError("Could not save trip. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copy(which: "view" | "edit") {
    const url = which === "view" ? links?.viewUrl : links?.editUrl;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  if (links) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Check size={12} /> Trip saved — share these links
        </p>
        <div className="space-y-1.5">
          <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Eye size={11} /> View-only link
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={links.viewUrl}
              className="flex-1 text-xs bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[var(--color-text-muted)] truncate"
            />
            <button
              data-testid="copy-view-link"
              onClick={() => copy("view")}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors shrink-0"
            >
              {copied === "view" ? <Check size={12} /> : <Copy size={12} />}
              {copied === "view" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        {links.editUrl && (
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Users size={11} /> Collaborative edit link
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={links.editUrl}
                className="flex-1 text-xs bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[var(--color-text-muted)] truncate"
              />
              <button
                data-testid="copy-edit-link"
                onClick={() => copy("edit")}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors shrink-0"
              >
                {copied === "edit" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "edit" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-faint)]">
              Anyone with this link can view the trip and add shared notes
            </p>
          </div>
        )}
        <button
          onClick={() => setLinks(null)}
          className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] underline"
        >
          Save another version
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        Save your current settings (travelers, budget, MPG) and get a shareable link.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          data-testid="share-mode-view"
          onClick={() => setMode("view")}
          className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border font-medium transition-colors ${mode === "view" ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]"}`}
        >
          <Eye size={12} /> View-only
        </button>
        <button
          data-testid="share-mode-edit"
          onClick={() => setMode("edit")}
          className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border font-medium transition-colors ${mode === "edit" ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]"}`}
        >
          <Users size={12} /> Collaborative
        </button>
      </div>
      <p className="text-xs text-[var(--color-text-faint)]">
        {mode === "view"
          ? "Anyone with the link can view your itinerary and costs."
          : "Generates both a view link and an edit link. Share the edit link with travel partners to add shared notes."}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={save}
        disabled={saving}
        data-testid="button-save-trip"
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-60"
      >
        {saving ? (
          <>
            <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
            Saving…
          </>
        ) : (
          <>
            <Save size={14} /> {mode === "edit" ? "Save & Get Edit Link" : "Save & Share Trip"}
          </>
        )}
      </button>
    </div>
  );
}

/** Draw + download the shareable trip card PNG (attribution: "Wanderlust Trip Planner"). */
function downloadShareCard(template: Trip, settings: Settings) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dark = document.documentElement.classList.contains("dark");
  ctx.fillStyle = dark ? "#0f1117" : "#fdf8f3";
  ctx.fillRect(0, 0, 800, 420);
  const gradient = ctx.createLinearGradient(0, 0, 800, 0);
  gradient.addColorStop(0, template.type === "road_trip" ? "#d97706" : "#3b82f6");
  gradient.addColorStop(1, template.type === "road_trip" ? "#f59e0b" : "#6366f1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 8);
  ctx.font = "64px serif";
  ctx.fillText(template.emoji, 48, 100);
  ctx.fillStyle = dark ? "#f5f0e8" : "#1a1410";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText(template.name, 140, 80);
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillStyle = dark ? "#8a7a6a" : "#7a6a5a";
  ctx.fillText(template.subtitle, 140, 110);
  const meta = [
    `${template.totalDays} days`,
    template.countries.join(", "),
    template.bestMonths.split(",")[0].split("–")[0].trim(),
  ];
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = dark ? "#6a5a4a" : "#9a8a7a";
  meta.forEach((m, i) => ctx.fillText(m, 140 + i * 200, 145));
  const est = estimateTripCosts(template, settings);
  ctx.fillStyle = template.type === "road_trip" ? "#d9770620" : "#3b82f620";
  ctx.beginPath();
  ctx.roundRect(48, 170, 580, 80, 12);
  ctx.fill();
  ctx.fillStyle = dark ? "#f5f0e8" : "#1a1410";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText(formatCurrency(est.total), 80, 220);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = dark ? "#8a7a6a" : "#7a6a5a";
  ctx.fillText(
    `est. total (×${settings.travelers} travelers, ${settings.budget})`,
    80,
    242,
  );
  ctx.fillStyle = dark ? "#5a4a3a" : "#baa89a";
  ctx.font = "14px system-ui, sans-serif";
  template.highlights.slice(0, 4).forEach((h, i) => {
    ctx.fillText("• " + h, 48 + (i % 2) * 330, 295 + Math.floor(i / 2) * 26);
  });
  ctx.fillStyle = dark ? "#3a2a1a" : "#e8ddd0";
  ctx.fillRect(0, 380, 800, 40);
  ctx.fillStyle = dark ? "#8a7a6a" : "#7a6a5a";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Wanderlust Trip Planner", 24, 405);
  const link = document.createElement("a");
  link.download = `${template.name.replace(/[^a-z0-9]/gi, "_")}_trip_card.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

interface DayNote {
  id: number;
  tripId: string;
  dayNumber: number;
  noteText: string;
  updatedAt: string;
}

interface TripDetailProps {
  templateId: string;
  settings: Settings;
  setSettings: (s: Settings) => void;
  gasPriceData: import("@/data/types").GasPriceData | null;
}

type TabId = "itinerary" | "map" | "weather" | "fuel" | "overview";

const TRIGGER_BASE =
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

export default function TripDetailPage({
  templateId,
  settings,
  setSettings,
  gasPriceData,
}: TripDetailProps) {
  const [, navigate] = useLocation();
  const { trips, isLoading: tripsLoading } = useTripsData();
  const foundTrip = trips.find((t) => t.id === templateId);
  // Fall back to the first template purely so the hooks below have data to work
  // with; when `foundTrip` is missing we render a loading/not-found screen instead.
  const trip = foundTrip ?? trips[0];
  const isRoadTrip = !!trip.roadTripDays;
  const roadDays = trip.roadTripDays || [];
  const intlDays = (trip.tripDays as unknown as InternationalDay[]) || [];

  const [departureDate, setDepartureDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteCustom() {
    if (!foundTrip?.isCustom) return;
    if (!window.confirm(`Delete "${trip.name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await apiRequest("DELETE", `/api/custom-trips/${trip.id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/custom-trips"] });
      navigate("/");
    } catch {
      setDeleting(false);
    }
  }

  const daysUntil = useMemo(() => {
    if (!departureDate) return null;
    const start = new Date(departureDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 14 ? diff : null;
  }, [departureDate]);

  const queryClient = useQueryClient();
  const { data: dayNotes = [] } = useQuery<DayNote[]>({
    queryKey: ["/api/day-notes", templateId],
  });
  const dayNotesByDay = useMemo(
    () => Object.fromEntries(dayNotes.map((n) => [n.dayNumber, n] as const)),
    [dayNotes],
  );
  const saveDayNote = async (dayNumber: number, noteText: string) => {
    await apiRequest("POST", `/api/day-notes/${templateId}/${dayNumber}`, { noteText });
    queryClient.invalidateQueries({ queryKey: ["/api/day-notes", templateId] });
  };

  const tripCurrency = tripCurrencies[templateId] || tripCurrencies.route66;
  const isForeignCurrency = tripCurrency.code !== "USD";
  const [showLocalCurrency, setShowLocalCurrency] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  useEffect(() => {
    if (isForeignCurrency) getExchangeRates().then((r) => setRates(r));
  }, [isForeignCurrency]);
  const activeCurrency =
    isForeignCurrency && showLocalCurrency && rates
      ? tripCurrency
      : { code: "USD", symbol: "$" };

  // Map stops via lookupCity. Road trips walk start → each `to` → end; international
  // trips walk each day's `location`. Consecutive days in the same city collapse to
  // one marker so multi-night stays (e.g. 3 days in Rome) don't stack pins.
  const mapStops = useMemo<RouteStop[]>(() => {
    const sequence: Array<{ name: string; day: number }> = [];
    if (isRoadTrip && roadDays.length > 0) {
      sequence.push({ name: roadDays[0].from, day: roadDays[0].day });
      roadDays.forEach((d) => sequence.push({ name: d.to, day: d.day }));
    } else if (intlDays.length > 0) {
      intlDays.forEach((d) => {
        if (d.location) sequence.push({ name: d.location, day: d.day });
      });
    }
    const resolved: RouteStop[] = [];
    sequence.forEach(({ name, day }) => {
      const coords = lookupCity(name);
      if (!coords) return;
      const prev = resolved[resolved.length - 1];
      if (prev && prev.lat === coords.lat && prev.lng === coords.lng) return;
      resolved.push({ day, name, lat: coords.lat, lng: coords.lng });
    });
    return resolved.map((stop, i) => ({
      ...stop,
      type: i === 0 ? "start" : i === resolved.length - 1 ? "end" : "stop",
    }));
  }, [isRoadTrip, roadDays, intlDays]);

  // Weather cities: the distinct, coordinate-resolvable stops along the route
  // (works for both road trips and international trips).
  const weatherCities = useMemo(() => {
    const list: string[] = [];
    mapStops.forEach((s) => {
      if (!list.includes(s.name)) list.push(s.name);
    });
    return list;
  }, [mapStops]);

  const accent =
    trip.type === "road_trip"
      ? "text-amber-600 dark:text-amber-400"
      : trip.type === "international"
        ? "text-blue-600 dark:text-blue-400"
        : "text-emerald-600 dark:text-emerald-400";
  const badge =
    trip.type === "road_trip"
      ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
      : trip.type === "international"
        ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40"
        : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40";
  const mapAccentHex = MAP_ACCENT_HEX[trip.type] || "#d97706";

  const headerStats = [
    {
      label: isRoadTrip ? "Miles" : "Days",
      val: isRoadTrip
        ? (trip.roadTripDays?.reduce((sum, d) => sum + d.miles, 0) || 0).toLocaleString()
        : String(trip.totalDays),
    },
    { label: "Days", val: String(trip.totalDays) },
    {
      label: "Best Time",
      val: trip.bestMonths.split(",")[0].split("–")[0].trim(),
    },
    ...(trip.difficulty
      ? [{ label: "Difficulty", val: `${trip.difficulty.overall.toFixed(1)}/5` }]
      : []),
  ];

  const tabs: Array<{ id: TabId; icon: ReactNode; label: string }> = [
    { id: "itinerary", icon: <CalendarDays size={12} />, label: "Days" },
    { id: "map", icon: <MapIcon size={12} />, label: "Map" },
    { id: "weather", icon: <CloudSun size={12} />, label: "Weather" },
    ...(isRoadTrip
      ? [{ id: "fuel" as TabId, icon: <Fuel size={12} />, label: "Fuel" }]
      : []),
    { id: "overview", icon: <MapPin size={12} />, label: "Overview" },
  ];

  const dateForDayIndex = (index: number): string | undefined => {
    if (!departureDate) return undefined;
    const d = new Date(departureDate + "T00:00:00");
    d.setDate(d.getDate() + index);
    return d.toISOString().split("T")[0];
  };

  const overviewDays: Array<{ day: number; label: string; attractions: Attraction[] }> =
    isRoadTrip
      ? roadDays.map((d) => ({
          day: d.day,
          label: `${d.from.split(",")[0]} → ${d.to.split(",")[0]}`,
          attractions: d.attractions,
        }))
      : intlDays.map((d) => ({
          day: d.day,
          label: d.location,
          attractions: d.attractions,
        }));

  // A custom trip may not be in the list yet while /api/custom-trips loads, or
  // the id may simply not exist.
  if (!foundTrip) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          {tripsLoading ? (
            <p className="text-[var(--color-text-muted)]">Loading trip…</p>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl mb-2">Trip not found</h1>
              <p className="text-[var(--color-text-muted)] mb-6">
                This itinerary doesn't exist or may have been deleted.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold"
              >
                Back to Explore
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft size={15} /> All Trips
          </button>
          {foundTrip?.isCustom && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/create/${trip.id}`)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={handleDeleteCustom}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
              >
                <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{trip.emoji}</span>
              <h1 className="font-display font-bold text-3xl">{trip.name}</h1>
            </div>
            <p className="text-[var(--color-text-muted)]">{trip.subtitle}</p>
            {gasPriceData?.isLive && isRoadTrip && (
              <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Fuel costs using live AAA prices ({gasPriceData.date})
              </p>
            )}
            {isForeignCurrency && (
              <div className="mt-2 flex items-center gap-2">
                <Coins size={12} className="text-[var(--color-text-faint)]" />
                <button
                  onClick={() => setShowLocalCurrency((v) => !v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${showLocalCurrency ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50"}`}
                >
                  {showLocalCurrency
                    ? `Showing ${tripCurrency.code} (${tripCurrency.symbol})`
                    : `Switch to ${tripCurrency.name} (${tripCurrency.symbol})`}
                </button>
                {rates && showLocalCurrency && (
                  <span className="text-xs text-[var(--color-text-faint)]">
                    1 USD = {rates.rates[tripCurrency.code]?.toFixed(2)} {tripCurrency.code}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {headerStats.map((stat) => (
              <div
                key={stat.label}
                className="text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2"
              >
                <div className={`font-bold text-lg ${accent}`}>{stat.val}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {trip.tags.map((tag) => (
            <Badge key={tag} className={`${badge} border text-xs`}>
              {tag}
            </Badge>
          ))}
        </div>
        {trip.transportNotes && (
          <p className="text-xs text-[var(--color-text-faint)] mb-6 flex items-center gap-1.5">
            {isRoadTrip ? <Car size={11} /> : <Plane size={11} />}
            {trip.transportNotes}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div
              className="mb-5 w-full grid h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${TRIGGER_BASE} flex items-center gap-1 text-xs ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : ""}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "itinerary" && (
              <div className="space-y-3 mt-0">
                <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-offset)]/60 rounded-xl border border-[var(--color-border)]">
                  <Calendar size={13} className="text-[var(--color-text-muted)] shrink-0" />
                  <label
                    className="text-xs text-[var(--color-text-muted)]"
                    htmlFor="departure-input"
                  >
                    Departure date
                  </label>
                  <input
                    id="departure-input"
                    data-testid="input-departure-date"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  {departureDate && (
                    <button
                      onClick={() => setDepartureDate("")}
                      className="text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {daysUntil !== null && (
                  <div
                    data-testid="weather-alert-banner"
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-300/60 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10"
                  >
                    <CloudSun
                      size={15}
                      className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {daysUntil === 0
                          ? "Trip starts today!"
                          : `Trip starts in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        Check the Weather tab for 14-day forecasts along your route. Pack
                        accordingly!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("weather")}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-200/60 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors shrink-0"
                    >
                      View forecast
                    </button>
                  </div>
                )}

                {isRoadTrip
                  ? roadDays.map((day, i) => (
                      <RoadTripDayCard
                        key={day.day}
                        day={day}
                        accent={accent}
                        badge={badge}
                        settings={settings}
                        isLast={i === roadDays.length - 1}
                        actualDate={dateForDayIndex(i)}
                        dayNote={dayNotesByDay[day.day]?.noteText}
                        onSaveNote={(text) => saveDayNote(day.day, text)}
                      />
                    ))
                  : intlDays.map((day, i) => (
                      <InternationalDayCard
                        key={day.day}
                        day={day}
                        accent={accent}
                        badge={badge}
                        settings={settings}
                        isLast={i === intlDays.length - 1}
                        actualDate={dateForDayIndex(i)}
                        dayNote={dayNotesByDay[day.day]?.noteText}
                        onSaveNote={(text) => saveDayNote(day.day, text)}
                      />
                    ))}
              </div>
            )}

            {activeTab === "map" && (
              <div className="mt-0">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                  {mapStops.length > 0 ? (
                    <Suspense
                      fallback={
                        <div className="h-[400px] bg-[var(--color-surface-offset)] animate-pulse" />
                      }
                    >
                      <RouteMap stops={mapStops} accentColor={mapAccentHex} />
                    </Suspense>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                      No map data for this route
                    </div>
                  )}
                  <div className="p-4 border-t border-[var(--color-border)]">
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Start
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> End
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ background: mapAccentHex }}
                        />{" "}
                        Overnight stop
                      </span>
                      <span className="flex items-center gap-1.5">
                        Click a pin for details · Scroll to zoom
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "weather" && (
              <div className="mt-0">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CloudSun size={15} className="text-[var(--color-primary)]" />
                    <h3 className="font-semibold text-sm">7-Day Forecast by Stop</h3>
                  </div>
                  {weatherCities.length > 0 ? (
                    <WeatherForecast cities={weatherCities} />
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      No city forecast data available for this route.
                    </p>
                  )}
                  <SeasonalTips templateId={templateId} />
                  <p className="mt-3 text-xs text-[var(--color-text-faint)]">
                    Showing current forecasts. For trip planning, pick your departure date in
                    Settings and return here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "fuel" && isRoadTrip && (
              <div className="mt-0">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Fuel size={15} className="text-[var(--color-primary)]" />
                    <h3 className="font-semibold text-sm">Fuel Stop Planner</h3>
                  </div>
                  <FuelPlanner template={trip} settings={settings} />
                </div>
              </div>
            )}

            {activeTab === "overview" && (
              <div className="mt-0">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                  <h3 className="font-semibold mb-4">Route Overview</h3>
                  <div className="relative">
                    {overviewDays.map((day, i) => (
                      <div key={day.day} className="flex gap-4 pb-5 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${accent} bg-[var(--color-surface-offset)]`}
                          >
                            {day.day}
                          </div>
                          {i < overviewDays.length - 1 && (
                            <div className="w-0.5 flex-1 bg-[var(--color-border)] mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="font-medium text-sm">{day.label}</div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {day.attractions.slice(0, 3).map((attraction, j) => (
                              <span
                                key={j}
                                className="text-xs bg-[var(--color-surface-offset)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]"
                              >
                                {attraction.name}
                              </span>
                            ))}
                            {day.attractions.length > 3 && (
                              <span className="text-xs text-[var(--color-text-faint)]">
                                +{day.attractions.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — sticks below the navbar so it stays with the itinerary as it scrolls */}
          <div className="space-y-5 lg:sticky lg:top-20 self-start">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Settings2 size={14} /> Settings
              </h3>
              <PersonalizeSettings
                template={trip}
                settings={settings}
                setSettings={setSettings}
              />
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Calculator size={14} /> Cost Breakdown
              </h3>
              <CostBreakdown
                template={trip}
                settings={settings}
                rates={rates}
                currencyCode={activeCurrency.code}
                currencySymbol={activeCurrency.symbol}
              />
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <FileDown size={14} /> Export
              </h3>
              <ExportItinerary template={trip} settings={settings} />
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  Share card (PNG)
                </p>
                <button
                  data-testid="btn-export-png"
                  onClick={() => downloadShareCard(trip, settings)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  Download Share Card
                </button>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Share2 size={14} /> Save & Share
              </h3>
              <ShareTrip templateId={templateId} templateName={trip.name} settings={settings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
