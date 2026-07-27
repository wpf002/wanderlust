import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Backpack,
  CalendarDays,
  Copy,
  Images,
  Loader2,
  MessageCircle,
  Telescope,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useTrips } from "@/data/useTrips";
import { DEFAULT_SETTINGS, type Trip } from "@/data/types";
import { estimateTripCosts, formatCurrency } from "@/lib/costs";
import { tripColors } from "@/lib/tripTheme";
import { plansApi, setMyMemberId, type DiscoverPlan } from "@/lib/plans";

/** "4 people" / "1 person" — the group behind a published plan. */
function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

function formatStartDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A single small stat on a Discover card. */
function Stat({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      {icon} {children}
    </span>
  );
}

function DiscoverCard({
  plan,
  trip,
  onFork,
}: {
  plan: DiscoverPlan;
  trip: Trip | undefined;
  onFork: (plan: DiscoverPlan, name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Older plans may carry a partial settings blob; fill the gaps so the
  // estimate can't blow up the whole grid.
  const estimate = trip
    ? estimateTripCosts(trip, { ...DEFAULT_SETTINGS, ...plan.settings })
    : null;
  const scheme = trip ? tripColors(trip) : null;

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onFork(plan, trimmed);
    } catch {
      setError("Couldn't copy this trip. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-colors hover:border-[var(--color-primary)]/50">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-offset)] text-2xl leading-none">
          {trip?.emoji ?? "🧭"}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium text-[var(--color-text-muted)] line-clamp-1">
            {trip?.name ?? plan.templateId}
          </div>
          <h3 className="font-display text-base font-bold leading-tight line-clamp-2">
            {plan.title}
          </h3>
        </div>
      </div>

      {/* A photo sells a trip better than any blurb. Every card gets a cover
          slot either way, so a trip with an album doesn't tower over one
          without and leave a hole in the row. */}
      <div
        className={`mt-3 h-36 overflow-hidden rounded-xl ${
          plan.coverUrl || !scheme
            ? "bg-[var(--color-surface-offset)]"
            : scheme.banner
        }`}
      >
        {plan.coverUrl ? (
          <img
            src={plan.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-30">
            {trip?.emoji ?? "🧭"}
          </div>
        )}
      </div>

      <p className="mt-3 min-h-[2.5rem] text-sm leading-snug text-[var(--color-text-muted)] line-clamp-3">
        {plan.blurb || trip?.subtitle || "No description yet."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stat icon={<Users size={12} />}>{peopleLabel(plan.memberCount)}</Stat>
        <Stat icon={<Copy size={12} />}>
          {plan.forkCount === 1 ? "1 copy" : `${plan.forkCount} copies`}
        </Stat>
        {estimate && (
          <Stat icon={<Wallet size={12} />}>
            {formatCurrency(estimate.perPerson)}
            <span className="text-[var(--color-text-faint)]">/person</span>
          </Stat>
        )}
        {plan.photoCount > 0 && (
          <Stat icon={<Images size={12} />}>{plan.photoCount}</Stat>
        )}
        {plan.commentCount > 0 && (
          <Stat icon={<MessageCircle size={12} />}>{plan.commentCount}</Stat>
        )}
        {plan.startDate && (
          <Stat icon={<CalendarDays size={12} />}>{formatStartDate(plan.startDate)}</Stat>
        )}
      </div>

      <div className="mt-auto pt-4">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            data-testid={`btn-fork-${plan.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-offset)]"
          >
            <Copy size={14} /> Copy Trip
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-bg)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                Your copy — who's starting it?
              </span>
              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                aria-label="Cancel copy"
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Your name"
                className="min-w-[8rem] flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button
                onClick={submit}
                disabled={!name.trim() || busy}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                {busy ? "Copying…" : "Copy Trip"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

type SortKey = "recent" | "popular";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently added" },
  { key: "popular", label: "Most copied" },
];

/** `/discover` — published group trips anyone can copy. */
export default function DiscoverPage() {
  const [, navigate] = useLocation();
  const trips = useTrips();
  const [plans, setPlans] = useState<DiscoverPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");

  // The server already returns newest-first, so "recent" keeps that order and
  // "popular" ranks by copy count with the newest breaking ties.
  const sortedPlans = useMemo(() => {
    if (!plans) return plans;
    if (sort === "recent") return plans;
    return [...plans].sort((a, b) => b.forkCount - a.forkCount);
  }, [plans, sort]);

  useEffect(() => {
    let cancelled = false;
    plansApi
      .discover()
      .then((list) => {
        if (!cancelled) setPlans(list);
      })
      .catch(() => {
        if (!cancelled) {
          setPlans([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function fork(plan: DiscoverPlan, name: string) {
    const created = await plansApi.fork(plan.id, name);
    const owner = created.members[0];
    if (owner) setMyMemberId(created.id, owner.id, created.token);
    navigate(`/g/${created.id}`);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <Telescope size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Discover</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Real trips other people planned. Copy one and make it yours.
            </p>
          </div>

          {/* Sort — only worth showing once there's more than one trip to order. */}
          {sortedPlans && sortedPlans.length > 1 && (
            <div className="ml-auto flex rounded-xl bg-[var(--color-surface-offset)]/60 p-1">
              {SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    sort === key
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nothing on a card says a whole shared workspace opens behind it. */}
        <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="font-semibold mb-1">A copy isn't just the itinerary</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-2xl">
            Every trip here opens a space you share with the people you're going
            with. Send them the link — no accounts, no spreadsheet.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <CalendarDays size={14} />, title: "Agree on dates", body: "Everyone taps the days they're free; the overlap picks itself." },
              { icon: <Wallet size={14} />, title: "Settle up", body: "Log what you paid and see the fewest payments that square everyone." },
              { icon: <Backpack size={14} />, title: "Pack together", body: "One list. Shared gear gets claimed, everything else you tick yourself." },
              { icon: <Images size={14} />, title: "Keep the photos", body: "A shared album and a running thread, during and after the trip." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-xl bg-[var(--color-surface-offset)]/60 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                  <span className="text-[var(--color-primary)]">{icon}</span>
                  {title}
                </div>
                <p className="text-xs leading-snug text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {plans === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
              <Telescope size={22} className="text-[var(--color-primary)]" />
            </div>
            <h2 className="font-display text-lg font-bold">
              {failed ? "Couldn't load Discover" : "Nothing published yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">
              {failed
                ? "The published trips couldn't be loaded. Refresh to try again."
                : "Be the first. Open one of your group trips and hit “Share publicly” — your itinerary shows up here for anyone to copy."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-5 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Browse trips
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedPlans!.map((plan) => (
              <DiscoverCard
                key={plan.id}
                plan={plan}
                trip={trips.find((t) => t.id === plan.templateId)}
                onFork={fork}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
