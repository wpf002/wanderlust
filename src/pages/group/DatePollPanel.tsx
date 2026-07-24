import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { bestWindows, plansApi, tallyAvailability } from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/* ------------------------------------------------------------------ */
/* Date helpers — plain JS Date, local time, no library                */
/* ------------------------------------------------------------------ */

/** Local YYYY-MM-DD (never UTC — that shifts the day west of Greenwich). */
function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Read an ISO day back as a local noon Date, safe for display. */
function fromIso(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function formatDay(iso: string): string {
  return fromIso(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullDay(iso: string): string {
  return fromIso(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Cells for a month grid: leading blanks, then every day of the month. */
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/** `Dates` tab — the date poll that answers "when can we all actually go?". */
export default function DatePollPanel({ plan, me, onPlan, totalDays }: PanelProps) {
  const today = new Date();
  // Open on the month the group is actually looking at: the locked start date,
  // else the earliest day anyone marked, else this month.
  const [cursor, setCursor] = useState(() => {
    const marked = plan.availability.map((a) => a.day).sort();
    const anchor = plan.startDate ?? marked.find((d) => d >= toIso(today));
    const at = anchor ? new Date(anchor + "T00:00:00") : today;
    return { year: at.getFullYear(), month: at.getMonth() };
  });
  /** Optimistic copy of my days while the save is in flight. */
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);

  const tally = useMemo(() => tallyAvailability(plan), [plan]);
  const byDay = useMemo(
    () => new Map(tally.map((t) => [t.day, t])),
    [tally],
  );
  const memberById = useMemo(
    () => new Map(plan.members.map((m) => [m.id, m])),
    [plan.members],
  );
  const windows = useMemo(
    () => bestWindows(plan, totalDays),
    [plan, totalDays],
  );

  const savedMine = useMemo(
    () =>
      me
        ? plan.availability.filter((a) => a.memberId === me.id).map((a) => a.day)
        : [],
    [plan.availability, me],
  );
  const mine = useMemo(() => new Set(draft ?? savedMine), [draft, savedMine]);

  const cells = monthCells(cursor.year, cursor.month);
  const todayIso = toIso(today);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );
  const everyoneDays = tally.filter((t) => t.everyone).length;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  async function toggleDay(iso: string) {
    if (!me) return;
    const set = new Set(mine);
    if (set.has(iso)) set.delete(iso);
    else set.add(iso);
    const next = [...set].sort();
    setDraft(next);
    setSaving(true);
    try {
      onPlan(await plansApi.setAvailability(plan.id, me.id, next));
      setDraft(null);
    } catch {
      setDraft(null); // fall back to whatever the server last told us
    } finally {
      setSaving(false);
    }
  }

  async function setStart(startDate: string | null) {
    setLocking(true);
    try {
      onPlan(await plansApi.update(plan.id, { startDate }));
    } catch {
      /* keep the current plan on failure */
    } finally {
      setLocking(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ Calendar */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="font-semibold">When can everyone go?</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text-muted)] mb-4 flex items-center gap-1.5">
          {me ? (
            <>
              Tap the days you're free.
              {saving && (
                <Loader2
                  size={12}
                  className="animate-spin text-[var(--color-text-faint)]"
                />
              )}
            </>
          ) : (
            "Join the trip to add your dates."
          )}
        </p>

        <div className="font-medium text-sm mb-2 text-center">{monthLabel}</div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((label, i) => (
            <div
              key={i}
              className="text-center text-[10px] uppercase tracking-wide text-[var(--color-text-faint)] py-1"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;
            const iso = toIso(date);
            const entry = byDay.get(iso);
            const count = entry?.count ?? 0;
            const everyone = entry?.everyone ?? false;
            const isMine = mine.has(iso);
            const isToday = iso === todayIso;
            const isPast = iso < todayIso;

            return (
              <button
                key={iso}
                onClick={() => void toggleDay(iso)}
                disabled={!me}
                aria-pressed={isMine}
                aria-label={`${formatFullDay(iso)} — ${count} available`}
                title={
                  count > 0
                    ? entry?.memberIds
                        .map((id) => memberById.get(id)?.name ?? "?")
                        .join(", ")
                    : "Nobody yet"
                }
                className={`relative flex flex-col items-center justify-center gap-0.5 aspect-square sm:aspect-auto sm:h-14 rounded-lg border text-xs transition-colors ${
                  everyone
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : count > 0
                      ? "bg-[var(--color-primary)]/10 border-[var(--color-border)]"
                      : "bg-transparent border-[var(--color-border)]"
                } ${isMine ? "ring-2 ring-[var(--color-primary)]" : ""} ${
                  isPast ? "opacity-45" : ""
                } ${me ? "hover:bg-[var(--color-surface-offset)] cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`leading-none ${isToday ? "font-bold text-[var(--color-primary)]" : ""}`}
                >
                  {date.getDate()}
                </span>
                <span className="flex items-center justify-center gap-[2px] h-[5px]">
                  {(entry?.memberIds ?? []).slice(0, 4).map((id) => (
                    <span
                      key={id}
                      className="w-[4px] h-[4px] rounded-full"
                      style={{ background: memberById.get(id)?.color ?? "#888" }}
                    />
                  ))}
                  {count > 4 && (
                    <span className="text-[8px] leading-none text-[var(--color-text-muted)]">
                      +{count - 4}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-[var(--color-divider)] text-[11px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/20 border border-emerald-500/50" />
            Everyone free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[var(--color-primary)]/10 border border-[var(--color-border)]" />
            Some free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border border-[var(--color-border)] ring-2 ring-[var(--color-primary)]" />
            You're free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-[4px] h-[4px] rounded-full bg-[var(--color-text-muted)]" />
            One dot per person
          </span>
        </div>
      </section>

      {/* -------------------------------------------------- Locked dates */}
      {plan.startDate && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-primary)]/40 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <CalendarDays size={16} className="text-[var(--color-primary)]" />
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                Locked in
              </div>
              <div className="text-sm font-semibold">
                Departing {formatFullDay(plan.startDate)}
              </div>
            </div>
            <button
              onClick={() => void setStart(null)}
              disabled={locking}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-50"
            >
              <X size={13} />
              Clear dates
            </button>
          </div>
        </section>
      )}

      {/* -------------------------------------------------- Best windows */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold">Best windows</h2>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {totalDays > 0
            ? `Stretches where every one of you is free. This trip runs ${totalDays} ${totalDays === 1 ? "day" : "days"}.`
            : "Stretches where every one of you is free."}
        </p>

        {windows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {plan.members.length === 0
              ? "Once people join and mark their days, the overlaps show up here."
              : everyoneDays === 0
                ? "No day works for everyone yet. Keep adding your dates above."
                : "No overlap yet — nudge whoever hasn't filled in their calendar."}
          </p>
        ) : (
          <ul className="space-y-2">
            {windows.map((w) => {
              const fits = totalDays > 0 && w.days >= totalDays;
              const isLocked = plan.startDate === w.start;
              return (
                <li
                  key={w.start}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {w.start === w.end
                        ? formatDay(w.start)
                        : `${formatDay(w.start)} – ${formatDay(w.end)}`}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {w.days} {w.days === 1 ? "day" : "days"} everyone's free
                      {totalDays > 0 && (
                        <>
                          {" · "}
                          <span
                            className={
                              fits
                                ? "text-emerald-500"
                                : "text-[var(--color-text-faint)]"
                            }
                          >
                            {fits
                              ? "fits the trip"
                              : `${totalDays - w.days} ${totalDays - w.days === 1 ? "day" : "days"} short`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isLocked ? (
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-500">
                      <Check size={13} />
                      Locked in
                    </span>
                  ) : (
                    <button
                      onClick={() => void setStart(w.start)}
                      disabled={locking}
                      className="px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      Lock in these dates
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
