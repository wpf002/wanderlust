import { useMemo, useState } from "react";
import { Backpack, Check, Package, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { SEASONS, buildPackingList } from "@/data/packing";
import { useTripsData } from "@/data/useTrips";
import { plansApi, type PlanMember, type PlanPackingItem } from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Tiny colored dot standing in for a member — rows get too tight for initials. */
function Dot({ member, title }: { member: PlanMember; title?: string }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: member.color }}
      title={title ?? member.name}
    />
  );
}

const CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5";
const INPUT =
  "w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";
const SMALL_SELECT =
  "text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

const DEFAULT_CATEGORY = "Other";

/**
 * Season picker + seed button — the empty-state CTA and its compact twin.
 * Top-level so re-rendering the panel doesn't remount (and unfocus) the select.
 */
function SeedControls({
  season,
  onSeason,
  onSeed,
  disabled,
  compact,
}: {
  season: string;
  onSeason: (value: string) => void;
  onSeed: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={season}
        onChange={(e) => onSeason(e.target.value)}
        aria-label="Season"
        className={compact ? SMALL_SELECT : `${INPUT} sm:w-auto`}
      >
        {SEASONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.emoji} {s.label}
          </option>
        ))}
      </select>
      <button
        onClick={onSeed}
        disabled={disabled}
        className={
          compact
            ? "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
            : "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-50"
        }
      >
        <Sparkles size={compact ? 12 : 15} />
        {compact ? "Add template items" : "Start from a template"}
      </button>
    </div>
  );
}

/** Category order follows first appearance, so a seeded list keeps its shape. */
function groupByCategory(items: PlanPackingItem[]) {
  const groups = new Map<string, PlanPackingItem[]>();
  for (const item of items) {
    const key = item.category || DEFAULT_CATEGORY;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()];
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/** `Packing` tab — one list for the whole group, split into shared and personal. */
export default function PackingPanel({ plan, me, onPlan }: PanelProps) {
  const { trips } = useTripsData();
  const trip = trips.find((t) => t.id === plan.templateId);

  const [season, setSeason] = useState(SEASONS[0]?.value ?? "summer");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newShared, setNewShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberById = useMemo(
    () => new Map(plan.members.map((m) => [m.id, m])),
    [plan.members],
  );
  const groups = useMemo(() => groupByCategory(plan.packing), [plan.packing]);
  const categoryNames = useMemo(
    () => [...new Set(plan.packing.map((i) => i.category || DEFAULT_CATEGORY))],
    [plan.packing],
  );

  /** Packed *for me*: a shared item once someone ticks it, mine once I tick it. */
  const isPackedForMe = (item: PlanPackingItem) =>
    item.shared ? item.done : me !== null && item.packedBy.includes(me.id);

  const total = plan.packing.length;
  const packed = plan.packing.filter(isPackedForMe).length;
  const percent = total === 0 ? 0 : Math.round((packed / total) * 100);

  /** Every template item flattened to the seed payload shape. */
  const templateItems = useMemo(() => {
    if (!trip) return [];
    return buildPackingList(trip, season).flatMap((category) =>
      category.items.map((item) => ({
        label: item.name,
        category: category.name,
        shared: false,
      })),
    );
  }, [trip, season]);

  /** Run a plansApi call and hand the fresh plan back to the shell. */
  async function run(work: () => Promise<typeof plan>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onPlan(await work());
    } catch {
      setError("Couldn't save that. Try again?");
    } finally {
      setBusy(false);
    }
  }

  function addItem() {
    const label = newLabel.trim();
    if (!label) return;
    const category = newCategory.trim() || DEFAULT_CATEGORY;
    setNewLabel("");
    void run(() =>
      plansApi.addPacking(plan.id, { label, category, shared: newShared }),
    );
  }

  function seedFromTemplate() {
    if (templateItems.length === 0) return;
    void run(() => plansApi.seedPacking(plan.id, templateItems));
  }

  const seedProps = {
    season,
    onSeason: setSeason,
    onSeed: seedFromTemplate,
    disabled: busy || templateItems.length === 0,
  };

  return (
    <div className="space-y-4">
      {/* Progress ---------------------------------------------------- */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
          <Backpack size={16} className="text-[var(--color-primary)]" />
          <h2 className="font-semibold">Packing</h2>
          <span className="text-xs text-[var(--color-text-muted)] ml-auto">
            {packed} of {total} packed
            {total > 0 && ` (${percent}%)`}
          </span>
        </div>

        <div className="w-full h-2.5 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Shared kit counts once for the group. Everything else you tick for
          yourself.
        </p>

        {/* Secondary seed — only worth offering once the list has something. */}
        {me && total > 0 && trip && (
          <div className="mt-4 pt-4 border-t border-[var(--color-divider)]">
            <SeedControls {...seedProps} compact />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-500 px-1" role="alert">
          {error}
        </p>
      )}

      {/* Empty state / template CTA ---------------------------------- */}
      {total === 0 && (
        <div className={CARD}>
          <div className="text-center py-6">
            <Package
              size={22}
              className="mx-auto mb-3 text-[var(--color-text-faint)]"
            />
            <h3 className="font-semibold mb-1">Nothing on the list yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-5 max-w-sm mx-auto">
              {me
                ? "Pull in a ready-made list for this trip, then trim it down and mark what's shared."
                : "Nobody's started the packing list for this trip."}
            </p>
            {me && trip && (
              <div className="flex justify-center">
                <SeedControls {...seedProps} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* The list ---------------------------------------------------- */}
      {total > 0 && (
        <div className={`${CARD} space-y-5`}>
          {groups.map(([category, items]) => {
            const catPacked = items.filter(isPackedForMe).length;
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {category}
                  </h3>
                  <span className="text-[11px] text-[var(--color-text-faint)] ml-auto tabular-nums">
                    {catPacked}/{items.length}
                  </span>
                </div>

                <ul className="divide-y divide-[var(--color-divider)]">
                  {items.map((item) => {
                    const claimer =
                      item.claimedBy === null
                        ? null
                        : memberById.get(item.claimedBy) ?? null;
                    const mine =
                      me !== null && item.packedBy.includes(me.id);
                    const checked = item.shared ? item.done : mine;

                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy || !me}
                          onChange={(e) => {
                            const next = e.target.checked;
                            void run(() =>
                              item.shared
                                ? plansApi.updatePacking(plan.id, item.id, {
                                    done: next,
                                  })
                                : plansApi.checkPacking(plan.id, item.id, next),
                            );
                          }}
                          aria-label={`Mark "${item.label}" packed`}
                          className="w-4 h-4 shrink-0 accent-[var(--color-primary)] cursor-pointer"
                        />

                        <span
                          className={`text-sm flex-1 min-w-[7rem] ${
                            checked
                              ? "line-through text-[var(--color-text-faint)]"
                              : ""
                          }`}
                        >
                          {item.label}
                          {item.shared && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] align-middle whitespace-nowrap">
                              Shared
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-2 ml-auto">
                          {item.shared ? (
                            <>
                              {claimer && <Dot member={claimer} />}
                              {me ? (
                                <select
                                  value={
                                    item.claimedBy === null
                                      ? ""
                                      : String(item.claimedBy)
                                  }
                                  disabled={busy}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    void run(() =>
                                      plansApi.updatePacking(plan.id, item.id, {
                                        claimedBy:
                                          value === "" ? null : Number(value),
                                      }),
                                    );
                                  }}
                                  aria-label={`Who's bringing "${item.label}"`}
                                  className={`${SMALL_SELECT} max-w-[8.5rem]`}
                                >
                                  <option value="">Nobody yet</option>
                                  {plan.members.map((m) => (
                                    <option key={m.id} value={String(m.id)}>
                                      {m.name}
                                      {me.id === m.id ? " (you)" : ""}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  {claimer ? claimer.name : "Nobody yet"}
                                </span>
                              )}
                            </>
                          ) : (
                            /* Personal — who's already packed theirs, at a glance. */
                            <div className="flex items-center gap-1.5">
                              {item.packedBy.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {item.packedBy.map((id) => {
                                    const member = memberById.get(id);
                                    return member ? (
                                      <Dot
                                        key={id}
                                        member={member}
                                        title={`${member.name} packed this`}
                                      />
                                    ) : null;
                                  })}
                                </div>
                              )}
                              <span className="text-[11px] text-[var(--color-text-faint)] tabular-nums whitespace-nowrap">
                                {item.packedBy.length} of {plan.members.length}
                              </span>
                            </div>
                          )}

                          {me && (
                            <button
                              onClick={() =>
                                void run(() =>
                                  plansApi.removePacking(plan.id, item.id),
                                )
                              }
                              disabled={busy}
                              title="Delete item"
                              aria-label={`Delete "${item.label}"`}
                              className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-red-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {percent === 100 && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <Check size={13} />
              You're all packed. Nothing left on your side.
            </p>
          )}
        </div>
      )}

      {/* Add an item ------------------------------------------------- */}
      {me ? (
        <div className={CARD}>
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Add an item
          </h2>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="Camp stove, sunscreen…"
                aria-label="Item"
                className={`${INPUT} sm:flex-1`}
              />
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                list="packing-categories"
                placeholder={DEFAULT_CATEGORY}
                aria-label="Category"
                className={`${INPUT} sm:w-44`}
              />
              <datalist id="packing-categories">
                {categoryNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Shared vs. personal decides the whole shape of the row. */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewShared(false)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                  !newShared
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                <Users size={12} />
                Everyone brings one
              </button>
              <button
                type="button"
                onClick={() => setNewShared(true)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                  newShared
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                <Package size={12} />
                Shared — one for the group
              </button>
            </div>

            <button
              onClick={addItem}
              disabled={!newLabel.trim() || busy}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Plus size={15} />
              Add
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-faint)] px-1">
          Only people on this trip can update the packing list.
        </p>
      )}
    </div>
  );
}
