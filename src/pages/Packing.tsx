import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Copy,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { trips } from "@/data/trips";
import {
  buildPackingList,
  SEASONS,
  type PackingCategory,
} from "@/data/packing";
import { apiRequest } from "@/lib/api";
import type { ChecklistItem } from "@/lib/checklist";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";

/** Build the checklist template id for a trip + season (bundle `dae`). */
function packingKey(tripId: string, season: string): string {
  return `packing_${tripId}_${season}`;
}

/** Packing List Generator page (bundle `fae`). */
export default function PackingPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tripId, setTripId] = useState(trips[0].id);
  const [season, setSeason] = useState("summer");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const seededKeys = useRef<Set<string>>(new Set());

  const trip = trips.find((t) => t.id === tripId) || trips[0];
  const categories = buildPackingList(trip, season);
  const key = packingKey(tripId, season);

  const { data: items = [], isFetched } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist", key],
  });

  const itemsByText = Object.fromEntries(items.map((it) => [it.text, it]));
  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const packedCount = items.filter((it) => it.completed).length;
  const percent =
    totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/checklist", key] });

  const seedItems = useMutation({
    mutationFn: (rows: { text: string; sortOrder: number }[]) =>
      Promise.all(
        rows.map(({ text, sortOrder }) =>
          apiRequest("POST", "/api/checklist", {
            templateId: key,
            text,
            completed: false,
            sortOrder,
            createdAt: new Date().toISOString(),
          }),
        ),
      ),
    onSuccess: invalidate,
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/checklist/${id}`, { completed }).then((r) =>
        r.json(),
      ),
    onSuccess: invalidate,
  });

  const resetAll = useMutation({
    mutationFn: () =>
      Promise.all(
        items.map((it) =>
          apiRequest("PATCH", `/api/checklist/${it.id}`, { completed: false }),
        ),
      ),
    onSuccess: invalidate,
  });

  // Seed the checklist rows the first time a trip+season combination is opened.
  // Guard on `isFetched` (not the stale `items` closure) so we only seed once the
  // query has actually resolved empty, and track keys we've already seeded so
  // React StrictMode's double-effect invoke can't double-insert the rows.
  useEffect(() => {
    if (!isFetched || items.length > 0) return;
    if (seededKeys.current.has(key)) return;
    seededKeys.current.add(key);

    const rows: { text: string; sortOrder: number }[] = [];
    let sortOrder = 0;
    categories.forEach((category) => {
      category.items.forEach((item) => {
        rows.push({ text: item.name, sortOrder: sortOrder++ });
      });
    });
    if (rows.length > 0) seedItems.mutate(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isFetched, items.length]);

  function handleToggle(text: string) {
    const item = itemsByText[text];
    if (item) toggleItem.mutate({ id: item.id, completed: !item.completed });
  }

  function toggleCategory(name: string) {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function copyList() {
    const seasonLabel = SEASONS.find((s) => s.value === season)?.label;
    const lines = [`PACKING LIST — ${trip.name} (${seasonLabel})\n`];
    categories.forEach((category) => {
      lines.push(`\n${category.icon} ${category.name}`);
      category.items.forEach((item) => {
        const row = itemsByText[item.name];
        lines.push(
          `  ${row?.completed ? "✓" : "☐"} ${item.name}${item.note ? ` (${item.note})` : ""}`,
        );
      });
    });
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> All Trips
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package size={24} className="text-[var(--color-primary)]" />
            <h1 className="font-display font-bold text-2xl">
              Packing List Generator
            </h1>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm">
            Select your trip and season — we'll build a personalized checklist
            with essentials, trip-specific gear, and pro tips. Your progress is
            saved automatically.
          </p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
                Trip
              </label>
              <Select value={tripId} onValueChange={setTripId}>
                <SelectTrigger className="h-10 text-sm" data-testid="select-trip">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.emoji} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
                Season
              </label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger
                  className="h-10 text-sm"
                  data-testid="select-season"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.emoji} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-semibold text-sm">
                {packedCount} of {totalItems} packed
              </span>
              <span className="text-[var(--color-text-muted)] text-sm ml-2">
                ({percent}%)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyList}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
                data-testid="btn-copy-list"
              >
                <Copy size={12} /> Copy List
              </button>
              <button
                onClick={() => resetAll.mutate()}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors text-[var(--color-text-muted)]"
                data-testid="btn-reset"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="w-full h-2.5 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          {percent === 100 && totalItems > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
              ✓ You're all packed! Have a great trip.
            </p>
          )}
        </div>

        <div className="space-y-3">
          {categories.map((category: PackingCategory) => {
            const expanded = collapsed[category.name] !== true;
            const catPacked = category.items.filter(
              (it) => itemsByText[it.name]?.completed,
            ).length;
            const catEssentials = category.items.filter(
              (it) => it.essential,
            ).length;
            return (
              <div
                key={category.name}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--color-surface-offset)]/40 transition-colors"
                  onClick={() => toggleCategory(category.name)}
                  data-testid={`category-${category.name}`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{category.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {catPacked}/{category.items.length} packed ·{" "}
                      {catEssentials} essentials
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {catPacked === category.items.length &&
                      category.items.length > 0 && (
                        <span className="whitespace-nowrap inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 border">
                          Done
                        </span>
                      )}
                    {expanded ? (
                      <ChevronDown
                        size={15}
                        className="text-[var(--color-text-muted)]"
                      />
                    ) : (
                      <ChevronRight
                        size={15}
                        className="text-[var(--color-text-muted)]"
                      />
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                    {category.items.map((item) => {
                      const done = !!itemsByText[item.name]?.completed;
                      return (
                        <button
                          key={item.name}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-offset)]/30 transition-colors"
                          onClick={() => handleToggle(item.name)}
                          data-testid={`item-${category.name}-${item.name}`}
                        >
                          {done ? (
                            <CheckCircle2
                              size={16}
                              className="text-[var(--color-primary)] mt-0.5 shrink-0"
                            />
                          ) : (
                            <Circle
                              size={16}
                              className="text-[var(--color-text-faint)] mt-0.5 shrink-0"
                            />
                          )}
                          <div className="flex-1">
                            <div
                              className={`text-sm ${done ? "line-through text-[var(--color-text-faint)]" : ""}`}
                            >
                              {item.name}
                              {item.essential && !done && (
                                <span className="ml-1.5 text-xs text-red-500 font-medium">
                                  essential
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs text-[var(--color-text-faint)] mt-0.5">
                                {item.note}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--color-text-faint)]">
            List auto-adjusts based on your trip type and season. Progress is
            saved and synced automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
