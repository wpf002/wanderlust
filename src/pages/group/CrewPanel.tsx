import { useState } from "react";
import { Check, Copy, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { plansApi, type PlanMember } from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/** Colored initial bubble for a member. */
function Avatar({ member, size = 32 }: { member: PlanMember; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        background: member.color,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden
    >
      {member.name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

/** `Crew` tab — who's in, how to invite more, and who's doing what. */
export default function CrewPanel({ plan, me, onPlan }: PanelProps) {
  const [copied, setCopied] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const memberById = new Map(plan.members.map((m) => [m.id, m]));
  const doneCount = plan.assignments.filter((a) => a.done).length;

  /** Run a plansApi call and hand the fresh plan back to the shell. */
  async function run(work: () => Promise<typeof plan>) {
    if (busy) return;
    setBusy(true);
    try {
      onPlan(await work());
    } catch {
      /* the shell keeps showing the last good plan */
    } finally {
      setBusy(false);
    }
  }

  function copyInvite() {
    const link = `${window.location.origin}/g/${plan.id}`;
    navigator.clipboard
      ?.writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  function addAssignment() {
    const label = newLabel.trim();
    if (!label) return;
    setNewLabel("");
    void run(() =>
      plansApi.addAssignment(plan.id, { label, assigneeId: me?.id ?? null }),
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- Crew */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold">Who's coming</h2>
          <span className="text-xs text-[var(--color-text-muted)] ml-auto">
            {plan.members.length}{" "}
            {plan.members.length === 1 ? "person" : "people"}
          </span>
        </div>

        {plan.members.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nobody has joined yet. Share the code below to get the group in.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)]">
            {plan.members.map((member) => {
              const isMe = me?.id === member.id;
              return (
                <li key={member.id} className="flex items-center gap-3 py-2.5">
                  <Avatar member={member} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {member.name}
                      {isMe && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] align-middle">
                          you
                        </span>
                      )}
                    </div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() =>
                        void run(() => plansApi.removeMember(plan.id, member.id))
                      }
                      disabled={busy}
                      title={`Remove ${member.name}`}
                      aria-label={`Remove ${member.name}`}
                      className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-red-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- Invite */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <h2 className="font-semibold mb-1">Invite the rest</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Anyone with this code can open the trip and add themselves — no
          account needed.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
            <div className="font-mono font-bold tracking-[0.3em] text-xl sm:text-2xl">
              {plan.id}
            </div>
          </div>
          <button
            onClick={copyInvite}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </div>
      </section>

      {/* --------------------------------------------------- Assignments */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold">Who's doing what</h2>
          {plan.assignments.length > 0 && (
            <span className="text-xs text-[var(--color-text-muted)] ml-auto">
              {doneCount} of {plan.assignments.length} done
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Split up the booking, the driving and the paperwork so nothing lands
          on one person.
        </p>

        {plan.assignments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Nothing assigned yet. Add the first job below — flights, the rental
            car, the group chat.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-divider)] mb-4">
            {plan.assignments.map((task) => {
              const assignee =
                task.assigneeId === null
                  ? null
                  : memberById.get(task.assigneeId) ?? null;
              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={busy}
                    onChange={(e) =>
                      void run(() =>
                        plansApi.updateAssignment(plan.id, task.id, {
                          done: e.target.checked,
                        }),
                      )
                    }
                    aria-label={`Mark "${task.label}" done`}
                    className="w-4 h-4 shrink-0 accent-[var(--color-primary)] cursor-pointer"
                  />

                  <span
                    className={`text-sm flex-1 min-w-[8rem] ${
                      task.done
                        ? "line-through text-[var(--color-text-faint)]"
                        : ""
                    }`}
                  >
                    {task.label}
                  </span>

                  <div className="flex items-center gap-2 ml-auto">
                    {assignee && <Avatar member={assignee} size={20} />}
                    <select
                      value={task.assigneeId === null ? "" : String(task.assigneeId)}
                      disabled={busy}
                      onChange={(e) => {
                        const value = e.target.value;
                        void run(() =>
                          plansApi.updateAssignment(plan.id, task.id, {
                            assigneeId: value === "" ? null : Number(value),
                          }),
                        );
                      }}
                      aria-label={`Assignee for "${task.label}"`}
                      className="text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] max-w-[9rem] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">Unassigned</option>
                      {plan.members.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name}
                          {me?.id === m.id ? " (you)" : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        void run(() =>
                          plansApi.removeAssignment(plan.id, task.id),
                        )
                      }
                      disabled={busy}
                      title="Delete task"
                      aria-label={`Delete "${task.label}"`}
                      className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-red-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex gap-2 flex-wrap">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addAssignment();
            }}
            placeholder="Book the rental car…"
            className="flex-1 min-w-[12rem] px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <button
            onClick={addAssignment}
            disabled={!newLabel.trim() || busy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Plus size={15} />
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
