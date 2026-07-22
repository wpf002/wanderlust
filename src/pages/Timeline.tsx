import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Compass,
  CheckCircle2,
  Car,
  Plane,
  PlaneTakeoff,
  DollarSign,
  Plus,
  Trash2,
  Clock,
  X,
  Star,
} from "lucide-react";
import type { Settings } from "@/data/types";
import { getTrip } from "@/data/trips";
import { estimateTripCosts, formatCurrency } from "@/lib/costs";
import { apiRequest } from "@/lib/api";
import Navbar from "@/components/Navbar";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const YEAR = 2026;

/** A saved trip row from GET /api/trips. */
interface SavedTrip {
  slug: string;
  templateId: string;
  templateName: string;
  settings: Settings;
  travelMonth: string | null;
  departureDate: string | null;
  isCompleted: boolean;
}

/** Month index (0–11) from a "YYYY-MM" travelMonth string (bundle `Qj`). */
function monthIndex(travelMonth: string | null): number {
  if (!travelMonth) return -1;
  const parts = travelMonth.split("-");
  return parts.length < 2 ? -1 : parseInt(parts[1], 10) - 1;
}

/** Total days for a template id, defaulting to 7 (bundle `zOe`). */
function tripDays(templateId: string): number {
  return getTrip(templateId)?.totalDays ?? 7;
}

const TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  road_trip: {
    bg: "bg-amber-100 dark:bg-amber-500/20",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-500/40",
  },
  international: {
    bg: "bg-blue-100 dark:bg-blue-500/20",
    text: "text-blue-800 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-500/40",
  },
};

/** Color set for a template id's trip type (bundle `e$`). */
function typeColors(templateId: string) {
  const type = getTrip(templateId)?.type || "road_trip";
  return TYPE_COLORS[type] || TYPE_COLORS.road_trip;
}

/** Emoji for a template id (bundle `Xh`). */
function tripEmoji(templateId: string): string {
  return getTrip(templateId)?.emoji || "✈️";
}

/** Trip type for a template id (bundle `GOe`). */
function tripType(templateId: string): string {
  return getTrip(templateId)?.type || "road_trip";
}

/** Whole days until a departure date, or null (bundle `qOe`). */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function tripTotal(saved: SavedTrip): number {
  const template = getTrip(saved.templateId);
  return template ? estimateTripCosts(template, saved.settings).total : 0;
}

/** Post-completion rating modal (bundle `WOe`). */
function RatingModal({
  templateId,
  templateName,
  onClose,
}: {
  templateId: string;
  templateName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [hover, setHover] = useState(0);

  const save = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/ratings/${templateId}`, { stars, review }).then(
        (r) => r.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ratings"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">Rate {templateName}</h3>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          How was the trip? Your rating shows on the Explore page.
        </p>
        <div className="flex gap-2 mb-4 justify-center">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(value)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={
                  value <= (hover || stars)
                    ? "text-amber-400 fill-amber-400"
                    : "text-[var(--color-border)]"
                }
              />
            </button>
          ))}
        </div>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Leave a short review (optional)…"
          rows={3}
          className="w-full text-sm p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => stars > 0 && save.mutate()}
            disabled={stars === 0 || save.isPending}
            className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40"
          >
            {save.isPending ? "Saving…" : "Save Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Planning timeline / countdown page (bundle `VOe`). */
export default function TimelinePage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [addingMonth, setAddingMonth] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{
    templateId: string;
    templateName: string;
  } | null>(null);

  const { data: savedTrips = [], isLoading } = useQuery<SavedTrip[]>({
    queryKey: ["/api/trips"],
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/trips"] });

  const setMonth = useMutation({
    mutationFn: ({ slug, month }: { slug: string; month: string | null }) =>
      apiRequest("PATCH", `/api/trips/${slug}/month`, { month }).then((r) =>
        r.json(),
      ),
    onSuccess: () => {
      invalidate();
      setAddingMonth(null);
    },
  });

  const setDeparture = useMutation({
    mutationFn: ({ slug, date }: { slug: string; date: string | null }) =>
      apiRequest("PATCH", `/api/trips/${slug}/departure`, { date }).then((r) =>
        r.json(),
      ),
    onSuccess: invalidate,
  });

  const setCompleted = useMutation({
    mutationFn: ({ slug, completed }: { slug: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/trips/${slug}/complete`, { completed }).then(
        (r) => r.json(),
      ),
    onSuccess: invalidate,
  });

  const deleteTrip = useMutation({
    mutationFn: (slug: string) =>
      apiRequest("DELETE", `/api/trips/${slug}`).then((r) => r.json()),
    onSuccess: () => {
      invalidate();
      setDeletingSlug(null);
    },
  });

  const scheduled = savedTrips.filter((t) => !!t.travelMonth);
  const completed = savedTrips.filter((t) => t.isCompleted);
  const upcoming = savedTrips.filter((t) => !t.isCompleted);
  const totalSpend = scheduled.reduce((sum, t) => sum + tripTotal(t), 0);

  const tripsByMonth: Record<number, SavedTrip[]> = {};
  for (let i = 0; i < 12; i++) tripsByMonth[i] = [];
  for (const trip of savedTrips) {
    const idx = monthIndex(trip.travelMonth);
    if (idx >= 0) tripsByMonth[idx].push(trip);
  }

  if (!isLoading && savedTrips.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <CalendarDays size={18} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="font-display font-bold text-xl">
              Trip Timeline — {YEAR}
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-offset)] flex items-center justify-center">
              <CalendarDays
                size={36}
                className="text-[var(--color-text-faint)]"
              />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">
                No trips scheduled yet
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto">
                Browse trips, open an itinerary, and save it with "Save &amp;
                Share" — then come back here to pin it to a month on your {YEAR}{" "}
                calendar.
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Compass size={15} /> Browse Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
              <CalendarDays size={20} className="text-[var(--color-primary)]" />
              Trip Timeline — {YEAR}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Assign saved trips to months, set departure dates, and track what
              you've completed.
            </p>
          </div>
          {scheduled.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-3 text-center">
              <div className="text-xl font-bold text-[var(--color-primary)]">
                {formatCurrency(totalSpend)}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Est. {YEAR} travel spend
              </div>
              <div className="text-xs text-[var(--color-text-faint)]">
                {scheduled.length} planned · {completed.length} completed
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {MONTHS.map((label, idx) => {
            const monthTrips = tripsByMonth[idx];
            const hasTrips = monthTrips.length > 0;
            return (
              <div
                key={label}
                data-testid={`timeline-month-${idx}`}
                className={`rounded-2xl border p-4 min-h-[130px] transition-colors ${hasTrips ? "bg-[var(--color-surface)] border-[var(--color-border)]" : "bg-[var(--color-surface)]/40 border-[var(--color-border)]/50"}`}
              >
                <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  {label} {YEAR}
                </div>
                <div className="space-y-2">
                  {monthTrips.map((trip) => {
                    const colors = typeColors(trip.templateId);
                    const emoji = tripEmoji(trip.templateId);
                    const type = tripType(trip.templateId);
                    const total = tripTotal(trip);
                    return (
                      <div
                        key={trip.slug}
                        data-testid={`timeline-trip-${trip.slug}`}
                        className={`p-2 rounded-xl border ${colors.bg} ${colors.border} ${trip.isCompleted ? "opacity-60" : ""}`}
                      >
                        <div
                          className={`flex items-center gap-1.5 text-xs font-semibold ${colors.text}`}
                        >
                          <span>{emoji}</span>
                          <span className="truncate flex-1">
                            {trip.templateName}
                          </span>
                          {trip.isCompleted && (
                            <CheckCircle2 size={10} className="shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div
                            className={`flex items-center gap-0.5 text-xs ${colors.text} opacity-80`}
                          >
                            {type === "road_trip" ? (
                              <Car size={9} />
                            ) : (
                              <Plane size={9} />
                            )}
                            <span>{tripDays(trip.templateId)}d</span>
                          </div>
                          <div
                            className={`flex items-center gap-0.5 text-xs ${colors.text} opacity-80`}
                          >
                            <DollarSign size={9} />
                            <span>{(total / 1000).toFixed(1)}k</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {savedTrips.length > 0 && (
                    <button
                      data-testid={`timeline-add-${idx}`}
                      className="w-full text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] flex items-center gap-1 py-1 rounded-lg hover:bg-[var(--color-surface-offset)]/50 transition-colors"
                      onClick={() => setAddingMonth(`add-${idx}`)}
                    >
                      <Plus size={11} /> Add
                    </button>
                  )}
                </div>
                {addingMonth === `add-${idx}` && (
                  <div className="mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2 shadow-lg z-10">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1.5">
                      Choose a saved trip:
                    </p>
                    {savedTrips.map((trip) => (
                      <button
                        key={trip.slug}
                        className="w-full text-left text-xs py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors flex items-center gap-2"
                        onClick={() =>
                          setMonth.mutate({
                            slug: trip.slug,
                            month: `${YEAR}-${String(idx + 1).padStart(2, "0")}`,
                          })
                        }
                      >
                        <span>{tripEmoji(trip.templateId)}</span>
                        <span>{trip.templateName}</span>
                      </button>
                    ))}
                    <button
                      className="w-full text-xs text-[var(--color-text-faint)] mt-1 py-1 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors"
                      onClick={() => setAddingMonth(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
            Loading trips…
          </div>
        )}

        {!isLoading && savedTrips.length > 0 && (
          <div>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <CalendarDays
                    size={15}
                    className="text-[var(--color-primary)]"
                  />
                  Upcoming Trips
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcoming.map((trip) => {
                    const emoji = tripEmoji(trip.templateId);
                    const total = tripTotal(trip);
                    const days = daysUntil(trip.departureDate);
                    return (
                      <div
                        key={trip.slug}
                        data-testid={`timeline-saved-${trip.slug}`}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {trip.templateName}
                            </div>
                            <div className="text-xs text-[var(--color-text-faint)]">
                              {trip.settings.travelers} traveler
                              {trip.settings.travelers !== 1 ? "s" : ""} ·{" "}
                              {formatCurrency(total)}
                            </div>
                          </div>
                          <button
                            data-testid={`btn-complete-${trip.slug}`}
                            title="Mark as completed"
                            onClick={() => {
                              setCompleted.mutate({
                                slug: trip.slug,
                                completed: true,
                              });
                              setRatingTarget({
                                templateId: trip.templateId,
                                templateName: trip.templateName,
                              });
                            }}
                            className="p-1 rounded-lg hover:bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] hover:text-emerald-500 transition-colors"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            data-testid={`btn-delete-${trip.slug}`}
                            title="Remove trip"
                            onClick={() => setDeletingSlug(trip.slug)}
                            className="p-1 rounded-lg hover:bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDays
                            size={11}
                            className="text-[var(--color-text-faint)] shrink-0"
                          />
                          <select
                            data-testid={`timeline-month-select-${trip.slug}`}
                            value={trip.travelMonth || ""}
                            onChange={(e) =>
                              setMonth.mutate({
                                slug: trip.slug,
                                month: e.target.value || null,
                              })
                            }
                            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                          >
                            <option value="">Unscheduled</option>
                            {MONTHS.map((label, idx) => (
                              <option
                                key={label}
                                value={`${YEAR}-${String(idx + 1).padStart(2, "0")}`}
                              >
                                {label} {YEAR}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <PlaneTakeoff
                            size={11}
                            className="text-[var(--color-text-faint)] shrink-0"
                          />
                          <input
                            data-testid={`timeline-departure-${trip.slug}`}
                            type="date"
                            value={trip.departureDate || ""}
                            onChange={(e) =>
                              setDeparture.mutate({
                                slug: trip.slug,
                                date: e.target.value || null,
                              })
                            }
                            placeholder="Set departure date"
                            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        {(() => {
                          if (days === null) return null;
                          if (days < 0) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-[var(--color-text-faint)] px-1">
                                <Clock size={10} /> Departed {Math.abs(days)}d
                                ago
                              </div>
                            );
                          }
                          if (days === 0) {
                            return (
                              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-1">
                                <Clock size={10} /> Departing today!
                              </div>
                            );
                          }
                          return (
                            <div
                              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full w-fit ${days <= 7 ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" : days <= 30 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]"}`}
                            >
                              <Clock size={10} /> {days} days away
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Completed Trips
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completed.map((trip) => {
                    const emoji = tripEmoji(trip.templateId);
                    const total = tripTotal(trip);
                    return (
                      <div
                        key={trip.slug}
                        data-testid={`timeline-completed-${trip.slug}`}
                        className="bg-[var(--color-surface)] border border-emerald-500/20 rounded-xl p-4 opacity-75"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate line-through text-[var(--color-text-muted)]">
                              {trip.templateName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={10} /> Completed ·{" "}
                              {formatCurrency(total)}
                            </div>
                          </div>
                          <button
                            data-testid={`btn-undo-complete-${trip.slug}`}
                            title="Mark as upcoming"
                            onClick={() =>
                              setCompleted.mutate({
                                slug: trip.slug,
                                completed: false,
                              })
                            }
                            className="p-1 rounded-lg hover:bg-[var(--color-surface-offset)] text-emerald-500 transition-colors"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            data-testid={`btn-delete-completed-${trip.slug}`}
                            onClick={() => setDeletingSlug(trip.slug)}
                            className="p-1 rounded-lg hover:bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {ratingTarget && (
          <RatingModal
            templateId={ratingTarget.templateId}
            templateName={ratingTarget.templateName}
            onClose={() => setRatingTarget(null)}
          />
        )}

        {deletingSlug && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-display font-bold text-base mb-2">
                Delete this trip?
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">
                This will permanently remove the saved trip. Your itinerary
                templates won't be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingSlug(null)}
                  className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTrip.mutate(deletingSlug)}
                  disabled={deleteTrip.isPending}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteTrip.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
