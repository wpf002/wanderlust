import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, MapPin, Save, ArrowLeft, GripVertical } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useTrip } from "@/data/useTrips";
import type { Trip, BudgetTier } from "@/data/types";
import Navbar from "@/components/Navbar";
import Slider from "@/components/Slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";

type TripType = "road_trip" | "international";

interface AttractionDraft {
  name: string;
  description: string;
}
interface HotelDraft {
  name: string;
  priceRange: string;
}
interface DayDraft {
  // road-trip fields
  from: string;
  to: string;
  miles: string;
  driveHours: string;
  overnight: string;
  hotelPriceRange: string;
  // international fields
  location: string;
  travelMethod: string;
  travelTime: string;
  attractions: AttractionDraft[];
  hotels: HotelDraft[];
}

interface FormState {
  name: string;
  subtitle: string;
  emoji: string;
  type: TripType;
  countries: string;
  tags: string;
  bestMonths: string;
  highlights: string;
  transportNotes: string;
  drive: number;
  physical: number;
  planning: number;
  days: DayDraft[];
}

const DAILY_BUDGETS: Record<TripType, Record<"budget" | "midrange" | "premium", BudgetTier>> = {
  road_trip: {
    budget: { perPersonPerDay: 80, label: "Budget", includes: "budget motels, fast food, shared fuel" },
    midrange: { perPersonPerDay: 150, label: "Mid-range", includes: "mid-range hotels, casual restaurants, fuel, some paid attractions" },
    premium: { perPersonPerDay: 280, label: "Premium", includes: "boutique hotels, nice restaurants, premium experiences" },
  },
  international: {
    budget: { perPersonPerDay: 130, label: "Budget", includes: "hostels/budget hotels, street food, public transport" },
    midrange: { perPersonPerDay: 250, label: "Mid-range", includes: "3-star hotels, restaurants, most attractions" },
    premium: { perPersonPerDay: 450, label: "Premium", includes: "4-5 star hotels, fine dining, private tours" },
  },
};

function emptyDay(): DayDraft {
  return {
    from: "",
    to: "",
    miles: "",
    driveHours: "",
    overnight: "",
    hotelPriceRange: "",
    location: "",
    travelMethod: "",
    travelTime: "",
    attractions: [],
    hotels: [],
  };
}

const EMPTY_FORM: FormState = {
  name: "",
  subtitle: "",
  emoji: "🧭",
  type: "road_trip",
  countries: "",
  tags: "",
  bestMonths: "",
  highlights: "",
  transportNotes: "",
  drive: 3,
  physical: 2,
  planning: 2,
  days: [emptyDay()],
};

/** Convert a saved Trip back into editable form state (for the edit flow). */
function tripToForm(trip: Trip): FormState {
  const isRoad = !!trip.roadTripDays;
  const days = (trip.roadTripDays || trip.tripDays || []) as Array<Record<string, unknown>>;
  return {
    name: trip.name,
    subtitle: trip.subtitle,
    emoji: trip.emoji,
    type: isRoad ? "road_trip" : "international",
    countries: trip.countries.join(", "),
    tags: trip.tags.join(", "),
    bestMonths: trip.bestMonths,
    highlights: trip.highlights.join(", "),
    transportNotes: trip.transportNotes,
    drive: trip.difficulty.driveIntensity ?? 3,
    physical: trip.difficulty.physicalActivity,
    planning: trip.difficulty.planningComplexity,
    days: days.map((d) => ({
      from: String(d.from ?? ""),
      to: String(d.to ?? ""),
      miles: d.miles != null ? String(d.miles) : "",
      driveHours: d.driveHours != null ? String(d.driveHours) : "",
      overnight: String(d.overnight ?? ""),
      hotelPriceRange: String(d.hotelPriceRange ?? ""),
      location: String(d.location ?? ""),
      travelMethod: String(d.travelMethod ?? ""),
      travelTime: String(d.travelTime ?? ""),
      attractions: ((d.attractions as Array<{ name: string; description?: string }>) || []).map((a) => ({
        name: a.name,
        description: a.description ?? "",
      })),
      hotels: ((d.hotels as Array<{ name: string; priceRange?: string }>) || []).map((h) => ({
        name: h.name,
        priceRange: h.priceRange ?? "",
      })),
    })),
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build a valid Trip object from the form (id is assigned by the server). */
function formToTrip(form: FormState): Omit<Trip, "id"> {
  const isRoad = form.type === "road_trip";
  const drive = Math.round((form.drive + form.physical + form.planning) / 3 * 10) / 10;
  const attractionsOf = (d: DayDraft) =>
    d.attractions
      .filter((a) => a.name.trim())
      .map((a) => ({ name: a.name, location: "", description: a.description }));
  const hotelsOf = (d: DayDraft) =>
    d.hotels.filter((h) => h.name.trim()).map((h) => ({ name: h.name, priceRange: h.priceRange }));

  const days = form.days.map((d, i) => {
    if (isRoad) {
      return {
        day: i + 1,
        from: d.from,
        to: d.to,
        miles: Number(d.miles) || 0,
        driveHours: Number(d.driveHours) || 0,
        overnight: d.overnight || d.to,
        hotelPriceRange: d.hotelPriceRange,
        hotels: hotelsOf(d),
        attractions: attractionsOf(d),
      };
    }
    return {
      day: i + 1,
      location: d.location,
      travelMethod: d.travelMethod,
      travelTime: d.travelTime,
      hotelPriceRange: d.hotelPriceRange,
      overnight: d.overnight || d.location,
      hotels: hotelsOf(d),
      attractions: attractionsOf(d),
    };
  });

  const derivedHighlights = form.days
    .flatMap((d) => d.attractions.map((a) => a.name))
    .filter(Boolean)
    .slice(0, 4);
  const highlights = splitList(form.highlights);

  return {
    name: form.name.trim(),
    subtitle: form.subtitle.trim(),
    emoji: form.emoji.trim() || "🧭",
    type: form.type,
    primaryTransport: isRoad ? "car" : "mixed",
    totalDays: form.days.length,
    countries: splitList(form.countries).length ? splitList(form.countries) : ["Custom"],
    currency: "USD",
    bestMonths: form.bestMonths.trim() || "Year-round",
    dailyBudgets: DAILY_BUDGETS[form.type],
    transportNotes: form.transportNotes.trim(),
    highlights: highlights.length ? highlights : derivedHighlights,
    tags: splitList(form.tags),
    difficulty: {
      driveIntensity: isRoad ? form.drive : undefined,
      physicalActivity: form.physical,
      planningComplexity: form.planning,
      overall: drive,
    },
    ...(isRoad ? { roadTripDays: days } : { tripDays: days }),
  } as Omit<Trip, "id">;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] placeholder-[var(--color-text-faint)]";
const labelClass = "text-xs font-medium text-[var(--color-text-muted)] mb-1 block";

export default function CreateTripPage({ editId }: { editId?: string }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const existing = useTrip(editId ?? "");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!editId);

  // Populate the form once the trip being edited is available.
  useEffect(() => {
    if (editId && existing && !hydrated) {
      setForm(tripToForm(existing));
      setHydrated(true);
    }
  }, [editId, existing, hydrated]);

  const isRoad = form.type === "road_trip";
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function updateDay(index: number, patch: Partial<DayDraft>) {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  }
  function addDay() {
    setForm((f) => ({ ...f, days: [...f.days, emptyDay()] }));
  }
  function removeDay(index: number) {
    setForm((f) => ({ ...f, days: f.days.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Please give your trip a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = formToTrip(form);
      const res = editId
        ? await apiRequest("PUT", `/api/custom-trips/${editId}`, payload)
        : await apiRequest("POST", "/api/custom-trips", payload);
      const saved: Trip = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/custom-trips"] });
      navigate(`/trip/${saved.id}`);
    } catch {
      setError("Could not save the trip. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> All Trips
        </button>

        <h1 className="font-display font-bold text-2xl mb-1">
          {editId ? "Edit Trip" : "Create a Trip"}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Build your own itinerary. It'll show up in Explore alongside the built-in trips.
        </p>

        {/* Basics */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-5">
          <h2 className="font-semibold text-sm mb-4">Basics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[5rem_1fr] gap-4 mb-4">
            <div>
              <label className={labelClass}>Emoji</label>
              <input
                className={`${inputClass} text-center text-xl`}
                value={form.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                maxLength={4}
              />
            </div>
            <div>
              <label className={labelClass}>Trip name *</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Great Lakes Loop"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className={labelClass}>Subtitle</label>
            <input
              className={inputClass}
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="e.g. Chicago to Toronto along the shore"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Trip type</label>
              <Select value={form.type} onValueChange={(v) => set("type", v as TripType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="road_trip">🚗 Road Trip</SelectItem>
                  <SelectItem value="international">✈️ International</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelClass}>Best months</label>
              <input
                className={inputClass}
                value={form.bestMonths}
                onChange={(e) => set("bestMonths", e.target.value)}
                placeholder="e.g. May–September"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Countries (comma-separated)</label>
              <input
                className={inputClass}
                value={form.countries}
                onChange={(e) => set("countries", e.target.value)}
                placeholder="United States, Canada"
              />
            </div>
            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="Coastal, Scenic, Food"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Highlights (comma-separated, optional)</label>
            <input
              className={inputClass}
              value={form.highlights}
              onChange={(e) => set("highlights", e.target.value)}
              placeholder="Left blank, we'll use your top attractions"
            />
          </div>
        </section>

        {/* Difficulty */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-5">
          <h2 className="font-semibold text-sm mb-4">Difficulty</h2>
          <div className="space-y-4">
            {isRoad && (
              <SliderRow label="Drive intensity" value={form.drive} onChange={(v) => set("drive", v)} />
            )}
            <SliderRow label="Physical activity" value={form.physical} onChange={(v) => set("physical", v)} />
            <SliderRow label="Planning complexity" value={form.planning} onChange={(v) => set("planning", v)} />
          </div>
        </section>

        {/* Days */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Itinerary ({form.days.length} days)</h2>
            <button
              onClick={addDay}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <Plus size={13} /> Add day
            </button>
          </div>
          <div className="space-y-4">
            {form.days.map((day, index) => (
              <DayEditor
                key={index}
                index={index}
                day={day}
                isRoad={isRoad}
                onChange={(patch) => updateDay(index, patch)}
                onRemove={form.days.length > 1 ? () => removeDay(index) : undefined}
              />
            ))}
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-60"
          >
            <Save size={15} /> {saving ? "Saving…" : editId ? "Save changes" : "Create trip"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm w-40 shrink-0">{label}</span>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} className="flex-1" />
      <span className="text-sm font-bold w-6 text-right">{value}</span>
    </div>
  );
}

function DayEditor({
  index,
  day,
  isRoad,
  onChange,
  onRemove,
}: {
  index: number;
  day: DayDraft;
  isRoad: boolean;
  onChange: (patch: Partial<DayDraft>) => void;
  onRemove?: () => void;
}) {
  function addAttraction() {
    onChange({ attractions: [...day.attractions, { name: "", description: "" }] });
  }
  function updateAttraction(i: number, patch: Partial<AttractionDraft>) {
    onChange({ attractions: day.attractions.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  }
  function removeAttraction(i: number) {
    onChange({ attractions: day.attractions.filter((_, j) => j !== i) });
  }
  function addHotel() {
    onChange({ hotels: [...day.hotels, { name: "", priceRange: "" }] });
  }
  function updateHotel(i: number, patch: Partial<HotelDraft>) {
    onChange({ hotels: day.hotels.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  }
  function removeHotel(i: number) {
    onChange({ hotels: day.hotels.filter((_, j) => j !== i) });
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-[var(--color-text-faint)]" />
          <span className="font-semibold text-sm">Day {index + 1}</span>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-red-500 transition-colors"
            aria-label="Remove day"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {isRoad ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>From</label>
              <input className={inputClass} value={day.from} onChange={(e) => onChange({ from: e.target.value })} placeholder="Chicago, IL" />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input className={inputClass} value={day.to} onChange={(e) => onChange({ to: e.target.value })} placeholder="Springfield, IL" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className={labelClass}>Miles</label>
              <input className={inputClass} type="number" value={day.miles} onChange={(e) => onChange({ miles: e.target.value })} placeholder="200" />
            </div>
            <div>
              <label className={labelClass}>Drive hrs</label>
              <input className={inputClass} type="number" value={day.driveHours} onChange={(e) => onChange({ driveHours: e.target.value })} placeholder="3.5" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Hotel price range</label>
              <input className={inputClass} value={day.hotelPriceRange} onChange={(e) => onChange({ hotelPriceRange: e.target.value })} placeholder="$90-160" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3">
            <label className={labelClass}>Location</label>
            <input className={inputClass} value={day.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="Rome" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>Travel method</label>
              <input className={inputClass} value={day.travelMethod} onChange={(e) => onChange({ travelMethod: e.target.value })} placeholder="train" />
            </div>
            <div>
              <label className={labelClass}>Travel time</label>
              <input className={inputClass} value={day.travelTime} onChange={(e) => onChange({ travelTime: e.target.value })} placeholder="~1h 30m" />
            </div>
          </div>
          <div className="mb-3">
            <label className={labelClass}>Hotel price range</label>
            <input className={inputClass} value={day.hotelPriceRange} onChange={(e) => onChange({ hotelPriceRange: e.target.value })} placeholder="$120-200" />
          </div>
        </>
      )}

      {/* Attractions */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <MapPin size={11} /> Attractions
          </span>
          <button onClick={addAttraction} className="text-xs text-[var(--color-primary)] hover:underline">
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {day.attractions.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-1.5">
                <input className={inputClass} value={a.name} onChange={(e) => updateAttraction(i, { name: e.target.value })} placeholder="Attraction name" />
                <input className={inputClass} value={a.description} onChange={(e) => updateAttraction(i, { description: e.target.value })} placeholder="Short description (optional)" />
              </div>
              <button onClick={() => removeAttraction(i)} className="p-1.5 mt-0.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500" aria-label="Remove attraction">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {day.attractions.length === 0 && (
            <p className="text-xs text-[var(--color-text-faint)]">No attractions yet.</p>
          )}
        </div>
      </div>

      {/* Hotels */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Hotels
          </span>
          <button onClick={addHotel} className="text-xs text-[var(--color-primary)] hover:underline">
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {day.hotels.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${inputClass} flex-1`} value={h.name} onChange={(e) => updateHotel(i, { name: e.target.value })} placeholder="Hotel name" />
              <input className={`${inputClass} w-32`} value={h.priceRange} onChange={(e) => updateHotel(i, { priceRange: e.target.value })} placeholder="$120-180" />
              <button onClick={() => removeHotel(i)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500" aria-label="Remove hotel">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {day.hotels.length === 0 && (
            <p className="text-xs text-[var(--color-text-faint)]">No hotels yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
