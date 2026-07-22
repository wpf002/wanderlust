import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  PiggyBank,
  TrendingUp,
  Download,
  RefreshCw,
  Target,
  Bell,
  BellOff,
  Zap,
  Plane,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useTrips } from "@/data/useTrips";
import { estimateTripCosts, formatCurrency } from "@/lib/costs";
import type { Settings } from "@/data/types";
import Navbar from "@/components/Navbar";

// recharts (~340 kB) is split into its own chunk and only fetched when the
// dashboard actually has trips to plot.
const SpendingCharts = lazy(() => import("./spending/SpendingCharts"));

/** Per-category chart colors (bundle `Ma`). */
const CATEGORY_COLORS = {
  fuel: "#f59e0b",
  flights: "#3b82f6",
  lodging: "#8b5cf6",
  activities: "#10b981",
  food: "#ef4444",
} as const;

interface SavedTrip {
  slug: string;
  templateId: string;
  templateName: string;
  settings: Settings;
  createdAt: string;
}

interface EnrichedTrip extends SavedTrip {
  fuel: number;
  flights: number;
  lodging: number;
  activities: number;
  food: number;
  total: number;
  perPerson: number;
  emoji: string;
  shortName: string;
}

type NotifPrefs = Record<string, boolean>;

/** Empty state shown when no trips have been saved (bundle `A1e`). */
function EmptyState({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-offset)] flex items-center justify-center">
        <PiggyBank size={28} className="text-[var(--color-text-faint)]" />
      </div>
      <h3 className="font-semibold text-lg">No saved trips yet</h3>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
        Save trips from the itinerary page using "Save &amp; Share" and they'll
        appear here with a full cost breakdown.
      </p>
      <button
        onClick={onExplore}
        className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold"
      >
        Browse Trips
      </button>
    </div>
  );
}

/** Budget-vs-actual progress bar (bundle `_1e`). */
function BudgetProgress({ spent, goal }: { spent: number; goal: number }) {
  const percent = Math.min((spent / goal) * 100, 100);
  const over = spent > goal;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-muted)]">Planned spend</span>
        <span
          className={`font-semibold ${
            over ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatCurrency(spent)} / {formatCurrency(goal)}
        </span>
      </div>
      <div className="w-full bg-[var(--color-surface-offset)] rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            over ? "bg-red-500" : percent > 80 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-[var(--color-text-faint)]">
        {over
          ? `${formatCurrency(spent - goal)} over annual travel budget`
          : `${formatCurrency(goal - spent)} remaining of annual travel budget`}
      </p>
    </div>
  );
}

/** `/dashboard` — saved-trip spend dashboard with charts (bundle `k1e`). */
export default function SpendingPage() {
  const [, navigate] = useLocation();
  const trips = useTrips();
  const [savedTrips, setSavedTrips] = useState<EnrichedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetGoal, setBudgetGoal] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({});

  async function loadPreferences() {
    try {
      const [budgetRes, pushRes, prefsRes] = await Promise.all([
        apiRequest("GET", "/api/settings/annual_budget"),
        apiRequest("GET", "/api/settings/push_notifications"),
        apiRequest("GET", "/api/notif-prefs"),
      ]);
      const budget = await budgetRes.json();
      const push = await pushRes.json();
      const prefs = await prefsRes.json();
      if (budget.value) setBudgetGoal(Number(budget.value));
      if (push.value) setPushEnabled(push.value === "true");
      if (prefs && typeof prefs === "object") setNotifPrefs(prefs);
    } catch {
      // ignore — preferences are optional
    }
  }

  async function toggleTripAlerts(templateId: string) {
    const next = { ...notifPrefs, [templateId]: !notifPrefs[templateId] };
    setNotifPrefs(next);
    try {
      await apiRequest("POST", "/api/notif-prefs", next);
    } catch {
      // ignore
    }
  }

  async function deleteTrip(slug: string) {
    try {
      await apiRequest("DELETE", `/api/trips/${slug}`);
      setSavedTrips((prev) => prev.filter((t) => t.slug !== slug));
      setPendingDelete(null);
    } catch {
      // ignore
    }
  }

  async function loadTrips() {
    setLoading(true);
    setError(null);
    try {
      const rows: SavedTrip[] = await (
        await apiRequest("GET", "/api/trips")
      ).json();
      if (!Array.isArray(rows)) throw new Error("unexpected response");
      const enriched = rows.map((row): EnrichedTrip => {
        const template = trips.find((t) => t.id === row.templateId);
        if (!template) {
          return {
            ...row,
            fuel: 0,
            lodging: 0,
            flights: 0,
            activities: 0,
            food: 0,
            total: 0,
            perPerson: 0,
            emoji: "🗺️",
            shortName: row.templateName,
          };
        }
        const costs = estimateTripCosts(template, row.settings);
        return {
          ...row,
          fuel: costs.fuel || 0,
          flights: costs.flights || 0,
          lodging: costs.lodging,
          activities: costs.activities || 0,
          food: costs.food || 0,
          total: costs.total,
          perPerson: costs.perPerson,
          emoji: template.emoji,
          shortName:
            template.name.length > 14
              ? template.name.split(" ").slice(0, 2).join(" ")
              : template.name,
        };
      });
      setSavedTrips(enriched);
    } catch {
      setError("Could not load saved trips.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
    loadPreferences();
  }, []);

  async function saveBudget() {
    const value = Number(budgetInput.replace(/[^0-9.]/g, ""));
    if (!value || value <= 0) return;
    setSavingBudget(true);
    try {
      await apiRequest("POST", "/api/settings/annual_budget", {
        value: String(value),
      });
      setBudgetGoal(value);
      setEditingBudget(false);
    } catch {
      // ignore
    }
    setSavingBudget(false);
  }

  async function togglePush() {
    setSavingPush(true);
    const next = !pushEnabled;
    try {
      await apiRequest("POST", "/api/settings/push_notifications", {
        value: String(next),
      });
      setPushEnabled(next);
    } catch {
      // ignore
    }
    setSavingPush(false);
  }

  const totalSpend = savedTrips.reduce((sum, t) => sum + t.total, 0);
  const totalFuel = savedTrips.reduce((sum, t) => sum + t.fuel, 0);
  const totalFlights = savedTrips.reduce((sum, t) => sum + t.flights, 0);
  const totalLodging = savedTrips.reduce((sum, t) => sum + t.lodging, 0);
  const totalActivities = savedTrips.reduce((sum, t) => sum + t.activities, 0);
  const totalFood = savedTrips.reduce((sum, t) => sum + t.food, 0);

  const barData = savedTrips.map((t) => ({
    name: t.shortName,
    ...(t.fuel ? { fuel: Math.round(t.fuel) } : {}),
    ...(t.flights ? { flights: Math.round(t.flights) } : {}),
    lodging: Math.round(t.lodging),
    activities: Math.round(t.activities),
    food: Math.round(t.food),
  }));

  const pieData = [
    { name: "Fuel", value: Math.round(totalFuel), color: CATEGORY_COLORS.fuel },
    {
      name: "Flights",
      value: Math.round(totalFlights),
      color: CATEGORY_COLORS.flights,
    },
    {
      name: "Lodging",
      value: Math.round(totalLodging),
      color: CATEGORY_COLORS.lodging,
    },
    {
      name: "Activities",
      value: Math.round(totalActivities),
      color: CATEGORY_COLORS.activities,
    },
    { name: "Food", value: Math.round(totalFood), color: CATEGORY_COLORS.food },
  ].filter((entry) => entry.value > 0);

  const summaryCards: {
    label: string;
    val: string;
    icon: ReactNode;
    accent: string;
  }[] = [
    {
      label: "Total Planned Spend",
      val: formatCurrency(totalSpend),
      icon: <PiggyBank size={14} />,
      accent: "text-[var(--color-primary)]",
    },
    {
      label: "Trips Saved",
      val: String(savedTrips.length),
      icon: <Zap size={14} />,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Avg per Trip",
      val: formatCurrency(totalSpend / savedTrips.length),
      icon: <TrendingUp size={14} />,
      accent: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Biggest Expense",
      val: formatCurrency(Math.max(...savedTrips.map((t) => t.total))),
      icon: <Plane size={14} />,
      accent: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Spend Dashboard</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                All your saved trips, cost visualized
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/trips-csv"
              download="wanderlust-trips.csv"
              data-testid="btn-export-csv"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors text-[var(--color-text-muted)]"
            >
              <Download size={12} /> Export CSV
            </a>
            <button
              onClick={loadTrips}
              data-testid="dashboard-refresh"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors text-[var(--color-text-muted)]"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target size={15} className="text-[var(--color-primary)]" />
              <span className="text-sm font-semibold">Annual Travel Budget</span>
            </div>
            {editingBudget ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">
                    $
                  </span>
                  <input
                    data-testid="budget-input"
                    type="number"
                    min="0"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveBudget()}
                    placeholder="10000"
                    className="w-full pl-7 pr-3 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    autoFocus
                  />
                </div>
                <button
                  onClick={saveBudget}
                  data-testid="budget-save"
                  disabled={savingBudget}
                  className="px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90"
                >
                  Set
                </button>
                <button
                  onClick={() => setEditingBudget(false)}
                  className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs hover:bg-[var(--color-surface-offset)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {budgetGoal ? (
                    <BudgetProgress spent={totalSpend} goal={budgetGoal} />
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No budget set yet
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setBudgetInput(budgetGoal ? String(budgetGoal) : "");
                    setEditingBudget(true);
                  }}
                  data-testid="budget-edit"
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors shrink-0"
                >
                  {budgetGoal ? "Edit" : "Set goal"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              {pushEnabled ? (
                <Bell size={15} className="text-[var(--color-primary)]" />
              ) : (
                <BellOff size={15} className="text-[var(--color-text-muted)]" />
              )}
              <span className="text-sm font-semibold">Price Alerts</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {pushEnabled
                    ? "Push notifications are on — gas, hotel, and flight alerts will also appear on your phone."
                    : "Enable push notifications to get gas, hotel, and flight alerts on your phone."}
                </p>
              </div>
              <button
                onClick={togglePush}
                data-testid="push-toggle"
                disabled={savingPush}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                  pushEnabled
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-surface-offset)]"
                }`}
                aria-label={
                  pushEnabled
                    ? "Disable push notifications"
                    : "Enable push notifications"
                }
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    pushEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {pushEnabled && (
              <p className="text-xs text-[var(--color-text-faint)] mt-2">
                Monitoring tasks will send alerts to both in-app and your device.
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
            {error}
          </div>
        )}

        {!loading && !error && savedTrips.length === 0 && (
          <EmptyState onExplore={() => navigate("/")} />
        )}

        {!loading && !error && savedTrips.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {summaryCards.map(({ label, val, icon, accent }) => (
                <div
                  key={label}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4"
                >
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-1.5">
                    {icon} {label}
                  </div>
                  <div className={`font-bold text-xl ${accent}`}>{val}</div>
                </div>
              ))}
            </div>

            <Suspense
              fallback={
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                  <div className="lg:col-span-2 h-[320px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
                  <div className="h-[320px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
                </div>
              }
            >
              <SpendingCharts
                barData={barData}
                pieData={pieData}
                totalFuel={totalFuel}
                totalFlights={totalFlights}
                colors={CATEGORY_COLORS}
              />
            </Suspense>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-semibold">Saved Trips</h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {savedTrips.map((trip) => (
                  <div key={trip.slug}>
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-surface-offset)]/40 transition-colors">
                      <span className="text-2xl shrink-0">{trip.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {trip.templateName}
                        </div>
                        <div className="text-xs text-[var(--color-text-faint)] mt-0.5">
                          {trip.settings.travelers} traveler
                          {trip.settings.travelers > 1 ? "s" : ""} ·{" "}
                          {trip.settings.budget} · saved{" "}
                          {new Date(trip.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold">
                          {formatCurrency(trip.total)}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {formatCurrency(trip.perPerson)}/person
                        </div>
                      </div>
                      <button
                        data-testid={`btn-notif-${trip.slug}`}
                        title={
                          notifPrefs[trip.templateId]
                            ? "Disable alerts for this trip"
                            : "Enable alerts for this trip"
                        }
                        onClick={() => toggleTripAlerts(trip.templateId)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors shrink-0"
                      >
                        {notifPrefs[trip.templateId] ? (
                          <Bell size={13} className="text-[var(--color-primary)]" />
                        ) : (
                          <BellOff
                            size={13}
                            className="text-[var(--color-text-faint)]"
                          />
                        )}
                      </button>
                      <a
                        href={`/trip/${trip.templateId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/trip/${trip.templateId}`);
                        }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors shrink-0"
                        data-testid={`trip-view-${trip.slug}`}
                      >
                        View <ExternalLink size={10} />
                      </a>
                      <button
                        data-testid={`btn-delete-trip-${trip.slug}`}
                        title="Remove this saved trip"
                        onClick={() => setPendingDelete(trip.slug)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {pendingDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-display font-bold text-base mb-2">
                Delete this trip?
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">
                This will permanently remove the saved trip and its budget data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTrip(pendingDelete)}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
