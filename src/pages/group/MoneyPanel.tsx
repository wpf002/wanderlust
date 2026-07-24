import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  HandCoins,
  Loader2,
  PlusCircle,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/costs";
import {
  balances,
  plansApi,
  settleUp,
  totalSpent,
  type PlanMember,
} from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Cents-exact money — settle-up sentences need "$170.00", not "$170". */
function exact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function MemberChip({ member }: { member: PlanMember | undefined }) {
  if (!member) return <span className="text-[var(--color-text-faint)]">someone</span>;
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: member.color }}
      />
      {member.name}
    </span>
  );
}

const CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5";
const INPUT =
  "w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export default function MoneyPanel({ plan, me, onPlan }: PanelProps) {
  const members = plan.members;
  const byId = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState<number | null>(me?.id ?? members[0]?.id ?? null);
  const [splitIds, setSplitIds] = useState<number[]>(() => members.map((m) => m.id));
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep payer / split valid as the crew changes.
  useEffect(() => {
    setPayerId((cur) =>
      cur !== null && members.some((m) => m.id === cur)
        ? cur
        : (me?.id ?? members[0]?.id ?? null),
    );
    setSplitIds((cur) => {
      const kept = cur.filter((id) => members.some((m) => m.id === id));
      return kept.length ? kept : members.map((m) => m.id);
    });
  }, [members, me?.id]);

  const spent = totalSpent(plan);
  const perPerson = members.length ? spent / members.length : 0;
  const rows = balances(plan);
  const myBalance = me ? rows.find((b) => b.memberId === me.id) ?? null : null;
  const transfers = settleUp(plan);
  const expenses = useMemo(
    () => [...plan.expenses].sort((a, b) => b.id - a.id),
    [plan.expenses],
  );

  const amountValue = Number.parseFloat(amount);
  const canSubmit =
    description.trim().length > 0 &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    payerId !== null &&
    splitIds.length > 0 &&
    !saving;

  async function submit() {
    if (!canSubmit || payerId === null) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await plansApi.addExpense(plan.id, {
        payerId,
        description: description.trim(),
        amount: Math.round(amountValue * 100) / 100,
        splitIds,
      });
      onPlan(updated);
      setDescription("");
      setAmount("");
    } catch {
      setError("Couldn't save that expense. Try again?");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setBusyId(id);
    try {
      const updated = await plansApi.removeExpense(plan.id, id);
      onPlan(updated);
    } catch {
      setError("Couldn't delete that expense.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleSplit(id: number) {
    setSplitIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  /* ---------------------------------------------------------------- */

  if (members.length === 0) {
    return (
      <div className={CARD}>
        <div className="text-center py-8">
          <Users size={22} className="mx-auto mb-3 text-[var(--color-text-faint)]" />
          <h2 className="font-semibold mb-1">Nobody's in yet</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Add your name up top to start tracking who paid for what.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary ----------------------------------------------------- */}
      <div className={CARD}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)] mb-1">
              Total spent
            </div>
            <div className="font-display font-bold text-2xl">{formatCurrency(spent)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)] mb-1">
              Per person
            </div>
            <div className="font-display font-bold text-2xl">
              {formatCurrency(perPerson)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              across {members.length} {members.length === 1 ? "person" : "people"}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)] mb-1">
              Your position
            </div>
            {myBalance ? (
              Math.abs(myBalance.net) < 0.005 ? (
                <div className="font-display font-bold text-2xl text-[var(--color-text-muted)]">
                  All square
                </div>
              ) : myBalance.net > 0 ? (
                <div>
                  <div className="font-display font-bold text-2xl text-emerald-500">
                    {exact(myBalance.net)}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    you're owed
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-display font-bold text-2xl text-rose-500">
                    {exact(-myBalance.net)}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">you owe</div>
                </div>
              )
            ) : (
              <div className="text-sm text-[var(--color-text-muted)] pt-1">
                Join the trip to see your share.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settle up --------------------------------------------------- */}
      <div className={CARD}>
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <HandCoins size={16} className="text-[var(--color-primary)]" />
          Settle up
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          The fewest payments that make everyone even.
        </p>

        {transfers.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Check size={15} className="text-emerald-500" />
            All square — nobody owes anybody a thing.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {transfers.map((t, i) => (
              <li
                key={`${t.fromId}-${t.toId}-${i}`}
                className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm bg-[var(--color-surface-offset)] rounded-xl px-3.5 py-3"
              >
                <MemberChip member={byId.get(t.fromId)} />
                <span className="text-[var(--color-text-muted)]">pays</span>
                <MemberChip member={byId.get(t.toId)} />
                <ArrowRight size={12} className="text-[var(--color-text-faint)]" />
                <span className="font-semibold tabular-nums">{exact(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Balances ---------------------------------------------------- */}
      <div className={CARD}>
        <h2 className="font-semibold mb-4">Who's up, who's down</h2>
        <div className="space-y-3">
          {rows.map((b) => {
            const member = byId.get(b.memberId);
            const even = Math.abs(b.net) < 0.005;
            return (
              <div key={b.memberId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    <MemberChip member={member} />
                    {me && me.id === b.memberId && (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                        you
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    paid {exact(b.paid)} · share {exact(b.owed)}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    even
                      ? "text-[var(--color-text-faint)]"
                      : b.net > 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                  }`}
                >
                  {even ? "even" : `${b.net > 0 ? "+" : "−"}${exact(Math.abs(b.net))}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add expense ------------------------------------------------- */}
      <div className={CARD}>
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <PlusCircle size={16} className="text-[var(--color-primary)]" />
          Add an expense
        </h2>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Gas, dinner, cabin…"
              className={`${INPUT} sm:flex-1`}
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              className={`${INPUT} sm:w-32`}
            />
          </div>

          <div>
            <label
              htmlFor="payer"
              className="block text-xs text-[var(--color-text-muted)] mb-1.5"
            >
              Paid by
            </label>
            <select
              id="payer"
              value={payerId ?? ""}
              onChange={(e) => setPayerId(Number(e.target.value))}
              className={INPUT}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {me && me.id === m.id ? " (you)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs text-[var(--color-text-muted)]">
                Split between{" "}
                {splitIds.length > 0 && (
                  <span className="text-[var(--color-text-faint)]">
                    ({splitIds.length}{" "}
                    {splitIds.length === 1 ? "way" : "ways"})
                  </span>
                )}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSplitIds(members.map((m) => m.id))}
                  className="text-[11px] px-2 py-1 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setSplitIds(me ? [me.id] : [])}
                  disabled={!me}
                  className="text-[11px] px-2 py-1 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
                >
                  Just me
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = splitIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer transition-colors ${
                      on
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleSplit(m.id)}
                      className="accent-[var(--color-primary)]"
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    {m.name}
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : "Add expense"}
          </button>
        </div>
      </div>

      {/* Expense list ------------------------------------------------ */}
      <div className={CARD}>
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Receipt size={16} className="text-[var(--color-primary)]" />
          Expenses
          <span className="text-xs font-normal text-[var(--color-text-faint)]">
            {expenses.length}
          </span>
        </h2>

        {expenses.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nothing logged yet. The first tank of gas has to go somewhere.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {expenses.map((e) => {
              const payer = byId.get(e.payerId);
              const ways = e.splitIds.length > 0 ? e.splitIds.length : 1;
              return (
                <li key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.description}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex flex-wrap items-center gap-x-1.5">
                      <MemberChip member={payer} />
                      <span>paid</span>
                      <span>·</span>
                      <span>
                        split {ways} {ways === 1 ? "way" : "ways"}
                      </span>
                      {e.dayNumber != null && (
                        <>
                          <span>·</span>
                          <span>Day {e.dayNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums shrink-0">
                    {exact(e.amount)}
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    disabled={busyId === e.id}
                    aria-label={`Delete ${e.description}`}
                    className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-rose-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
                  >
                    {busyId === e.id ? (
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
