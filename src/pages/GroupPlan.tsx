import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Globe2,
  ListChecks,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useTripsData } from "@/data/useTrips";
import {
  currentTripDay,
  getMyMemberId,
  plansApi,
  setMyMemberId,
  type Plan,
  type PlanMember,
} from "@/lib/plans";

const CrewPanel = lazy(() => import("./group/CrewPanel"));
const DatePollPanel = lazy(() => import("./group/DatePollPanel"));
const MoneyPanel = lazy(() => import("./group/MoneyPanel"));
const InTripPanel = lazy(() => import("./group/InTripPanel"));

export interface PanelProps {
  plan: Plan;
  me: PlanMember | null;
  /** Panels call this with the server's updated plan after any mutation. */
  onPlan: (plan: Plan) => void;
  /** Total days in the underlying itinerary. */
  totalDays: number;
}

type TabId = "crew" | "dates" | "money" | "trip";

/** `short` keeps every tab labelled on a phone, where "On the trip" won't fit. */
const TABS: { id: TabId; label: string; short: string; icon: typeof Users }[] = [
  { id: "crew", label: "Crew", short: "Crew", icon: Users },
  { id: "dates", label: "Dates", short: "Dates", icon: CalendarDays },
  { id: "money", label: "Money", short: "Money", icon: Wallet },
  { id: "trip", label: "On the trip", short: "Trip", icon: ListChecks },
];

/** `/g/:code` — the shared home for one group's trip. */
export default function GroupPlanPage({ code }: { code: string }) {
  const [, navigate] = useLocation();
  const { trips } = useTripsData();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [tab, setTab] = useState<TabId>("crew");
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blurbOpen, setBlurbOpen] = useState(false);
  const [blurbInput, setBlurbInput] = useState("");
  const [publishing, setPublishing] = useState(false);

  const upper = code.toUpperCase();

  useEffect(() => {
    let cancelled = false;
    plansApi
      .get(upper)
      .then((p) => {
        if (cancelled) return;
        setPlan(p);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [upper]);

  const myId = getMyMemberId(upper);
  const me = plan?.members.find((m) => m.id === myId) ?? null;
  const trip = plan ? trips.find((t) => t.id === plan.templateId) : undefined;
  const totalDays = trip?.totalDays ?? 0;
  const tripDay = plan && totalDays ? currentTripDay(plan, totalDays) : null;

  const onPlan = useCallback((p: Plan) => setPlan(p), []);

  async function join() {
    const name = nameInput.trim();
    if (!name) return;
    setJoining(true);
    try {
      const { member, plan: updated } = await plansApi.join(upper, name);
      setMyMemberId(upper, member.id);
      setPlan(updated);
    } finally {
      setJoining(false);
    }
  }

  /** Publish (with a one-line blurb) or unpublish this plan on Discover. */
  async function setPublished(next: boolean, blurb?: string) {
    if (!plan) return;
    setPublishing(true);
    try {
      const updated = await plansApi.update(plan.id, {
        isPublished: next,
        ...(blurb !== undefined ? { blurb } : {}),
      });
      setPlan(updated);
      setBlurbOpen(false);
    } finally {
      setPublishing(false);
    }
  }

  function copyLink() {
    navigator.clipboard
      ?.writeText(`${window.location.origin}/g/${upper}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  if (status === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-[var(--color-text-muted)] gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading trip…
        </div>
      </Shell>
    );
  }

  if (status === "missing" || !plan) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-24">
          <h1 className="font-display font-bold text-xl mb-2">
            No trip with that code
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Double-check the link, or start a new group trip from any itinerary.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold"
          >
            Browse trips
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <button
            onClick={() => navigate(`/trip/${plan.templateId}`)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 mb-1"
          >
            {trip ? `${trip.emoji} ${trip.name}` : plan.templateId}
            <ArrowRight size={11} />
          </button>
          <h1 className="font-display font-bold text-2xl">{plan.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {plan.members.length}{" "}
            {plan.members.length === 1 ? "person" : "people"} in ·{" "}
            {tripDay ? (
              <span className="text-[var(--color-primary)] font-medium">
                Day {tripDay} — trip is underway
              </span>
            ) : plan.startDate ? (
              `Departing ${new Date(plan.startDate + "T12:00:00").toLocaleDateString()}`
            ) : (
              "No dates locked in yet"
            )}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  Invite code
                </div>
                <div className="font-mono font-bold tracking-widest text-sm">{plan.id}</div>
              </div>
              {copied ? (
                <Check size={15} className="text-emerald-500" />
              ) : (
                <Copy size={15} className="text-[var(--color-text-muted)]" />
              )}
            </button>

            {/* Share publicly — lists this plan on /discover */}
            {plan.isPublished ? (
              <button
                onClick={() => setPublished(false)}
                disabled={publishing}
                title="Remove from Discover"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium disabled:opacity-50 transition-colors"
              >
                <Globe2 size={14} /> Published to Discover
              </button>
            ) : (
              <button
                onClick={() => {
                  setBlurbInput(plan.blurb ?? "");
                  setBlurbOpen((open) => !open);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] text-xs font-medium transition-colors"
              >
                <Globe2 size={14} /> Share publicly
              </button>
            )}
          </div>

          {blurbOpen && !plan.isPublished && (
            <div className="flex gap-2 w-full sm:w-[24rem]">
              <input
                value={blurbInput}
                onChange={(e) => setBlurbInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPublished(true, blurbInput.trim())}
                placeholder="One line about this trip"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button
                onClick={() => setPublished(true, blurbInput.trim())}
                disabled={publishing}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Join gate — you can look around, but you act as someone */}
      {!me && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-primary)]/40 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold mb-1">Join this trip</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Add your name so the group knows you're in. No account needed.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="Your name"
              className="flex-1 min-w-[12rem] px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <button
              onClick={join}
              disabled={!nameInput.trim() || joining}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {joining ? "Joining…" : "I'm in"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="mb-5 grid gap-1 rounded-xl bg-[var(--color-surface-offset)]/60 p-1"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
      >
        {TABS.map(({ id, label, short, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
              tab === id
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Icon size={13} className="shrink-0" />
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="h-64 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
        }
      >
        {tab === "crew" && (
          <CrewPanel plan={plan} me={me} onPlan={onPlan} totalDays={totalDays} />
        )}
        {tab === "dates" && (
          <DatePollPanel plan={plan} me={me} onPlan={onPlan} totalDays={totalDays} />
        )}
        {tab === "money" && (
          <MoneyPanel plan={plan} me={me} onPlan={onPlan} totalDays={totalDays} />
        )}
        {tab === "trip" && (
          <InTripPanel plan={plan} me={me} onPlan={onPlan} totalDays={totalDays} />
        )}
      </Suspense>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</div>
    </div>
  );
}
