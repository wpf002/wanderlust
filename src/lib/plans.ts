import { apiRequest } from "@/lib/api";
import type { Settings } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Types — mirror the server's plan payload                            */
/* ------------------------------------------------------------------ */

export interface PlanMember {
  id: number;
  name: string;
  color: string;
  joinedAt?: string;
}

export interface PlanAvailability {
  memberId: number;
  day: string;
}

export interface PlanExpense {
  id: number;
  payerId: number;
  description: string;
  amount: number;
  splitIds: number[];
  category: string | null;
  dayNumber: number | null;
  createdAt: string;
}

export interface PlanAssignment {
  id: number;
  label: string;
  category: string;
  assigneeId: number | null;
  done: boolean;
}

export interface PlanJournalEntry {
  id: number;
  memberId: number | null;
  dayNumber: number | null;
  text: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  templateId: string;
  title: string;
  settings: Settings;
  startDate: string | null;
  isPublished: boolean;
  blurb: string | null;
  forkCount: number;
  forkedFrom: string | null;
  createdAt: string;
  members: PlanMember[];
  availability: PlanAvailability[];
  expenses: PlanExpense[];
  assignments: PlanAssignment[];
  journal: PlanJournalEntry[];
}

export interface DiscoverPlan {
  id: string;
  templateId: string;
  title: string;
  blurb: string | null;
  settings: Settings;
  startDate: string | null;
  forkCount: number;
  memberCount: number;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* API client                                                          */
/* ------------------------------------------------------------------ */

const json = <T,>(r: Response) => r.json() as Promise<T>;

export const plansApi = {
  create: (body: {
    templateId: string;
    title: string;
    ownerName?: string;
    settings?: Settings;
  }) => apiRequest("POST", "/api/plans", body).then(json<Plan>),

  get: (code: string) =>
    apiRequest("GET", `/api/plans/${code.toUpperCase()}`).then(json<Plan>),

  update: (
    code: string,
    body: Partial<{
      title: string;
      settings: Settings;
      startDate: string | null;
      isPublished: boolean;
      blurb: string;
    }>,
  ) => apiRequest("PATCH", `/api/plans/${code}`, body).then(json<Plan>),

  join: (code: string, name: string) =>
    apiRequest("POST", `/api/plans/${code.toUpperCase()}/members`, { name }).then(
      json<{ member: PlanMember; plan: Plan }>,
    ),

  removeMember: (code: string, memberId: number) =>
    apiRequest("DELETE", `/api/plans/${code}/members/${memberId}`).then(json<Plan>),

  setAvailability: (code: string, memberId: number, days: string[]) =>
    apiRequest("PUT", `/api/plans/${code}/availability/${memberId}`, { days }).then(
      json<Plan>,
    ),

  addExpense: (
    code: string,
    body: {
      payerId: number;
      description: string;
      amount: number;
      splitIds: number[];
      category?: string;
      dayNumber?: number;
    },
  ) => apiRequest("POST", `/api/plans/${code}/expenses`, body).then(json<Plan>),

  removeExpense: (code: string, id: number) =>
    apiRequest("DELETE", `/api/plans/${code}/expenses/${id}`).then(json<Plan>),

  addAssignment: (
    code: string,
    body: { label: string; category?: string; assigneeId?: number | null },
  ) => apiRequest("POST", `/api/plans/${code}/assignments`, body).then(json<Plan>),

  updateAssignment: (
    code: string,
    id: number,
    body: Partial<{ assigneeId: number | null; done: boolean; label: string }>,
  ) => apiRequest("PATCH", `/api/plans/${code}/assignments/${id}`, body).then(json<Plan>),

  removeAssignment: (code: string, id: number) =>
    apiRequest("DELETE", `/api/plans/${code}/assignments/${id}`).then(json<Plan>),

  addJournal: (
    code: string,
    body: { memberId?: number | null; dayNumber?: number | null; text: string },
  ) => apiRequest("POST", `/api/plans/${code}/journal`, body).then(json<Plan>),

  removeJournal: (code: string, id: number) =>
    apiRequest("DELETE", `/api/plans/${code}/journal/${id}`).then(json<Plan>),

  discover: () => apiRequest("GET", "/api/discover").then(json<DiscoverPlan[]>),

  fork: (code: string, ownerName?: string) =>
    apiRequest("POST", `/api/plans/${code}/fork`, { ownerName }).then(json<Plan>),
};

/* ------------------------------------------------------------------ */
/* Date poll                                                           */
/* ------------------------------------------------------------------ */

export interface DayTally {
  day: string;
  memberIds: number[];
  count: number;
  everyone: boolean;
}

/** Count availability per day, flagging days the whole group can make. */
export function tallyAvailability(plan: Plan): DayTally[] {
  const byDay = new Map<string, number[]>();
  for (const a of plan.availability) {
    const list = byDay.get(a.day) ?? [];
    list.push(a.memberId);
    byDay.set(a.day, list);
  }
  const total = plan.members.length;
  return [...byDay.entries()]
    .map(([day, memberIds]) => ({
      day,
      memberIds,
      count: memberIds.length,
      everyone: total > 0 && memberIds.length === total,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * The longest runs of consecutive days everyone can make — the actual answer
 * to "when can we all go?".
 */
export function bestWindows(plan: Plan, tripLength: number): { start: string; end: string; days: number }[] {
  const free = tallyAvailability(plan)
    .filter((d) => d.everyone)
    .map((d) => d.day);
  if (free.length === 0) return [];

  const runs: string[][] = [];
  let run: string[] = [];
  for (const day of free) {
    if (run.length === 0) {
      run = [day];
      continue;
    }
    const prev = new Date(run[run.length - 1] + "T00:00:00");
    const cur = new Date(day + "T00:00:00");
    const consecutive = (cur.getTime() - prev.getTime()) / 86400000 === 1;
    if (consecutive) run.push(day);
    else {
      runs.push(run);
      run = [day];
    }
  }
  if (run.length) runs.push(run);

  return runs
    .map((r) => ({ start: r[0], end: r[r.length - 1], days: r.length }))
    .sort((a, b) => {
      // Prefer windows that actually fit the trip, then the longest.
      const aFits = a.days >= tripLength ? 1 : 0;
      const bFits = b.days >= tripLength ? 1 : 0;
      if (aFits !== bFits) return bFits - aFits;
      return b.days - a.days;
    });
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export interface Balance {
  memberId: number;
  paid: number;
  owed: number;
  net: number;
}

export interface Transfer {
  fromId: number;
  toId: number;
  amount: number;
}

/** What each member paid, what they owe, and the difference. */
export function balances(plan: Plan): Balance[] {
  const paid = new Map<number, number>();
  const owed = new Map<number, number>();
  for (const m of plan.members) {
    paid.set(m.id, 0);
    owed.set(m.id, 0);
  }
  for (const e of plan.expenses) {
    const ids = e.splitIds.length > 0 ? e.splitIds : [e.payerId];
    paid.set(e.payerId, (paid.get(e.payerId) ?? 0) + e.amount);
    const share = e.amount / ids.length;
    for (const id of ids) owed.set(id, (owed.get(id) ?? 0) + share);
  }
  return plan.members.map((m) => {
    const p = paid.get(m.id) ?? 0;
    const o = owed.get(m.id) ?? 0;
    return { memberId: m.id, paid: p, owed: o, net: p - o };
  });
}

/**
 * Greedy settle-up: repeatedly match the biggest debtor to the biggest
 * creditor. Produces at most (members - 1) transfers.
 */
export function settleUp(plan: Plan): Transfer[] {
  const EPS = 0.005;
  const debtors = balances(plan)
    .filter((b) => b.net < -EPS)
    .map((b) => ({ id: b.memberId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances(plan)
    .filter((b) => b.net > EPS)
    .map((b) => ({ id: b.memberId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      fromId: debtors[i].id,
      toId: creditors[j].id,
      amount: Math.round(amount * 100) / 100,
    });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < EPS) i += 1;
    if (creditors[j].amount < EPS) j += 1;
  }
  return transfers;
}

export function totalSpent(plan: Plan): number {
  return plan.expenses.reduce((sum, e) => sum + e.amount, 0);
}

/* ------------------------------------------------------------------ */
/* Local identity — who am I in this plan (per browser)                */
/* ------------------------------------------------------------------ */

const meKey = (code: string) => `plan-me:${code.toUpperCase()}`;

export function getMyMemberId(code: string): number | null {
  const raw = localStorage.getItem(meKey(code));
  return raw ? Number(raw) : null;
}

export function setMyMemberId(code: string, memberId: number): void {
  localStorage.setItem(meKey(code), String(memberId));
}

/** Which day of the trip is today (1-indexed), or null if not underway. */
export function currentTripDay(plan: Plan, totalDays: number): number | null {
  if (!plan.startDate) return null;
  const start = new Date(plan.startDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return diff >= 1 && diff <= totalDays ? diff : null;
}
