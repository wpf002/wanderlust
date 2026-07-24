import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { useTrips } from "@/data/useTrips";
import type { Attraction } from "@/data/types";
import { currentTripDay, plansApi, type PlanMember } from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5";
const INPUT =
  "w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "just now" / "4h ago" / "3d ago" — good enough for a trip journal. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

/** Whole days from today until `iso` (negative if past). */
function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

interface DayView {
  heading: string;
  subtitle?: string;
  meta: string[];
  attractions: Attraction[];
}

function Avatar({ member }: { member: PlanMember | undefined }) {
  const label = member?.name ?? "?";
  return (
    <span
      className="w-6 h-6 rounded-full shrink-0 grid place-items-center text-[10px] font-bold text-white"
      style={{ backgroundColor: member?.color ?? "var(--color-text-faint)" }}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export default function InTripPanel({ plan, me, onPlan, totalDays }: PanelProps) {
  const trips = useTrips();
  const trip = trips.find((t) => t.id === plan.templateId);

  const roadDays = trip?.roadTripDays;
  const intlDays = trip?.tripDays;
  const dayCount = Math.max(
    1,
    totalDays || roadDays?.length || intlDays?.length || 1,
  );

  const tripDay = currentTripDay(plan, dayCount);
  const [selectedDay, setSelectedDay] = useState<number>(tripDay ?? 1);
  const [showAllJournal, setShowAllJournal] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [busyEntry, setBusyEntry] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(plan.members.map((m) => [m.id, m])),
    [plan.members],
  );

  /* Day content ---------------------------------------------------- */

  const dayView: DayView | null = useMemo(() => {
    if (roadDays && roadDays.length) {
      const d = roadDays[selectedDay - 1];
      if (!d) return null;
      const meta = [
        d.miles ? `${d.miles} mi` : "",
        d.driveHours ? `${d.driveHours}h driving` : "",
        d.overnight ? `Overnight in ${d.overnight}` : "",
      ].filter(Boolean);
      return {
        heading: d.to ? `${d.from} → ${d.to}` : d.from,
        subtitle: d.driveHoursNote,
        meta,
        attractions: d.attractions ?? [],
      };
    }
    if (intlDays && intlDays.length) {
      const d = intlDays[selectedDay - 1];
      if (!d) return null;
      const meta = [
        d.base ? `Based in ${d.base}` : "",
        d.transport ?? "",
      ].filter(Boolean);
      return {
        heading: d.title ?? d.location,
        subtitle: d.title ? d.location : undefined,
        meta,
        attractions: d.activities ?? d.attractions ?? [],
      };
    }
    return null;
  }, [roadDays, intlDays, selectedDay]);

  /* Expenses for the selected day ---------------------------------- */

  const dayExpenses = useMemo(
    () =>
      plan.expenses
        .filter((e) => e.dayNumber === selectedDay)
        .sort((a, b) => b.id - a.id),
    [plan.expenses, selectedDay],
  );
  const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  /* Journal --------------------------------------------------------- */

  const entries = useMemo(() => {
    const list = showAllJournal
      ? plan.journal
      : plan.journal.filter((j) => j.dayNumber === selectedDay);
    return [...list].sort((a, b) => b.id - a.id);
  }, [plan.journal, selectedDay, showAllJournal]);

  /* Actions --------------------------------------------------------- */

  const amountValue = Number.parseFloat(amount);
  const canAddExpense =
    !!me &&
    description.trim().length > 0 &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    !savingExpense;

  async function addExpense() {
    if (!canAddExpense || !me) return;
    setSavingExpense(true);
    setError(null);
    try {
      const updated = await plansApi.addExpense(plan.id, {
        payerId: me.id,
        description: description.trim(),
        amount: Math.round(amountValue * 100) / 100,
        splitIds: plan.members.map((m) => m.id),
        dayNumber: selectedDay,
      });
      onPlan(updated);
      setDescription("");
      setAmount("");
    } catch {
      setError("Couldn't save that expense.");
    } finally {
      setSavingExpense(false);
    }
  }

  async function post() {
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    try {
      const updated = await plansApi.addJournal(plan.id, {
        memberId: me?.id ?? null,
        dayNumber: selectedDay,
        text: body,
      });
      onPlan(updated);
      setText("");
    } catch {
      setError("Couldn't post that. Try again?");
    } finally {
      setPosting(false);
    }
  }

  async function removeEntry(id: number) {
    setBusyEntry(id);
    try {
      const updated = await plansApi.removeJournal(plan.id, id);
      onPlan(updated);
    } catch {
      setError("Couldn't delete that entry.");
    } finally {
      setBusyEntry(null);
    }
  }

  const startDate = plan.startDate;
  const startsIn = startDate ? daysUntil(startDate) : null;

  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Status header ----------------------------------------------- */}
      <div
        className={
          tripDay
            ? "bg-[var(--color-surface)] border border-[var(--color-primary)]/50 rounded-2xl p-5"
            : CARD
        }
      >
        {tripDay ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display font-bold text-3xl text-[var(--color-primary)]">
              Day {tripDay}
            </h2>
            <span className="text-sm text-[var(--color-text-muted)]">
              of {dayCount} — you're on the road right now.
            </span>
          </div>
        ) : startsIn !== null && startsIn > 0 ? (
          <div className="flex items-start gap-3">
            <CalendarDays size={18} className="text-[var(--color-primary)] mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-xl">
                Starts in {startsIn} {startsIn === 1 ? "day" : "days"}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                Departing{" "}
                {new Date((startDate ?? "") + "T12:00:00").toLocaleDateString()}. Have a
                look at what's coming.
              </p>
            </div>
          </div>
        ) : startsIn !== null && startsIn <= 0 ? (
          <div className="flex items-start gap-3">
            <CalendarDays size={18} className="text-[var(--color-text-muted)] mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-xl">Trip's a wrap</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                The dates have passed — the journal below is all yours to reread.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <CalendarDays size={18} className="text-[var(--color-text-muted)] mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-xl">
                Dates aren't locked in yet
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                Pick a start date on the Dates tab and this turns into a live day-by-day
                view. Until then, here's day 1.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Day selector ------------------------------------------------ */}
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
            disabled={selectedDay <= 1}
            aria-label="Previous day"
            className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="text-sm font-semibold">
            Day {selectedDay}
            <span className="text-[var(--color-text-faint)] font-normal">
              {" "}
              / {dayCount}
            </span>
          </div>
          <button
            onClick={() => setSelectedDay((d) => Math.min(dayCount, d + 1))}
            disabled={selectedDay >= dayCount}
            aria-label="Next day"
            className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSelectedDay(n)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                n === selectedDay
                  ? "bg-[var(--color-primary)] text-white"
                  : n === tripDay
                    ? "border border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Itinerary for the day --------------------------------------- */}
      <div className={CARD}>
        {dayView ? (
          <>
            <div className="flex items-start gap-2 mb-1">
              <MapPin size={16} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
              <h3 className="font-semibold leading-snug">{dayView.heading}</h3>
            </div>
            {dayView.subtitle && (
              <p className="text-xs text-[var(--color-text-muted)] ml-6">
                {dayView.subtitle}
              </p>
            )}
            {dayView.meta.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 ml-6 mt-2 text-xs text-[var(--color-text-muted)]">
                {dayView.meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            )}

            {dayView.attractions.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {dayView.attractions.map((a, i) => (
                  <li
                    key={`${a.name}-${i}`}
                    className="bg-[var(--color-surface-offset)] rounded-xl px-3.5 py-3"
                  >
                    <div className="text-sm font-medium">{a.name}</div>
                    {a.location && (
                      <div className="text-xs text-[var(--color-text-faint)] mt-0.5">
                        {a.location}
                      </div>
                    )}
                    {a.description && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                    {a.hours && (
                      <div className="text-xs text-[var(--color-text-faint)] mt-1.5">
                        {a.hours}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                No stops planned for this day — a rare gift. Go find something.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No itinerary detail for day {selectedDay}.
          </p>
        )}
      </div>

      {/* Quick expense ------------------------------------------------ */}
      <div className={CARD}>
        <h3 className="font-semibold flex items-center gap-2 mb-1">
          <Wallet size={16} className="text-[var(--color-primary)]" />
          Day {selectedDay} spending
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Logged as paid by you and split across everyone.
        </p>

        {me ? (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
              placeholder="Lunch, tickets, parking…"
              className={`${INPUT} sm:flex-1`}
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              className={`${INPUT} sm:w-28`}
            />
            <button
              onClick={addExpense}
              disabled={!canAddExpense}
              className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
            >
              {savingExpense ? <Loader2 size={14} className="animate-spin" /> : "Add"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Join the trip up top to log spending.
          </p>
        )}

        {dayExpenses.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nothing spent on day {selectedDay} yet.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-[var(--color-border)]">
              {dayExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{e.description}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {byId.get(e.payerId)?.name ?? "someone"} paid
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {money(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--color-border)] text-sm">
              <span className="text-[var(--color-text-muted)]">Day total</span>
              <span className="font-semibold tabular-nums">{money(dayTotal)}</span>
            </div>
          </>
        )}
      </div>

      {/* Journal ------------------------------------------------------ */}
      <div className={CARD}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--color-primary)]" />
            Group journal
          </h3>
          <button
            onClick={() => setShowAllJournal((v) => !v)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            {showAllJournal ? `Day ${selectedDay} only` : "Show all days"}
          </button>
        </div>

        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={`What happened on day ${selectedDay}?`}
            className={`${INPUT} resize-y`}
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-xs text-[var(--color-text-faint)]">
              Posting to day {selectedDay}
              {me ? ` as ${me.name}` : " anonymously"}
            </span>
            <button
              onClick={post}
              disabled={!text.trim() || posting}
              className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {posting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              Post
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}

        {entries.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles size={20} className="mx-auto mb-2 text-[var(--color-text-faint)]" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {showAllJournal
                ? "The journal's empty. Someone has to write the first line."
                : `Nothing written for day ${selectedDay} yet.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const author = e.memberId != null ? byId.get(e.memberId) : undefined;
              return (
                <li key={e.id} className="flex items-start gap-2.5">
                  <Avatar member={author} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-medium text-[var(--color-text)]">
                        {author?.name ?? "Someone"}
                      </span>
                      <span className="text-[var(--color-text-faint)]">
                        {timeAgo(e.createdAt)}
                      </span>
                      {showAllJournal && e.dayNumber != null && (
                        <span className="text-[var(--color-text-faint)]">
                          · Day {e.dayNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {e.text}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEntry(e.id)}
                    disabled={busyEntry === e.id}
                    aria-label="Delete entry"
                    className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-rose-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
                  >
                    {busyEntry === e.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
