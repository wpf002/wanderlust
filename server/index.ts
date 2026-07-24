import express from "express";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  db,
  getSetting,
  setSetting,
  type ChecklistRow,
  type CommentRow,
  type CustomTripRow,
  type DayNoteRow,
  type NoteRow,
  type NotifPrefRow,
  type PlanAssignmentRow,
  type PlanDateRow,
  type PlanExpenseRow,
  type PlanJournalRow,
  type PlanMemberRow,
  type PlanRow,
  type RatingRow,
  type SettingRow,
  type TripRow,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const now = () => new Date().toISOString();
const newSlug = () => randomBytes(6).toString("base64url");

/* ---------- JSON shapes (what the frontend destructures) ---------- */

function tripToJson(row: TripRow, includeEditSlug = false) {
  return {
    id: row.id,
    slug: row.slug,
    ...(includeEditSlug && row.edit_slug ? { editSlug: row.edit_slug } : {}),
    templateId: row.template_id,
    templateName: row.template_name,
    settings: JSON.parse(row.settings) as unknown,
    notes: row.notes,
    travelMonth: row.travel_month,
    departureDate: row.departure_date,
    isCompleted: !!row.is_completed,
    createdAt: row.created_at,
  };
}

function checklistToJson(row: ChecklistRow) {
  return {
    id: row.id,
    templateId: row.template_id,
    text: row.text,
    completed: !!row.completed,
    sortOrder: row.sort_order,
    dueDate: row.due_date,
    createdAt: row.created_at,
  };
}

function commentToJson(row: CommentRow) {
  return {
    id: row.id,
    slug: row.slug,
    authorName: row.author_name,
    commentText: row.comment_text,
    createdAt: row.created_at,
  };
}

function dayNoteToJson(row: DayNoteRow) {
  return {
    id: row.id,
    tripId: row.trip_id,
    dayNumber: row.day_number,
    noteText: row.note_text,
    updatedAt: row.updated_at,
  };
}

function noteToJson(row: NoteRow) {
  return {
    id: row.id,
    templateId: row.template_id,
    noteText: row.note_text,
    updatedAt: row.updated_at,
  };
}

function ratingToJson(row: RatingRow) {
  return {
    id: row.id,
    templateId: row.template_id,
    stars: row.stars,
    review: row.review,
    createdAt: row.created_at,
  };
}

/* ---------- Settings ---------- */

app.get("/api/settings", (_req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as SettingRow[];
  res.json(rows);
});

app.get("/api/settings/:key", (req, res) => {
  // Always 200 — the frontend reads `.value` and treats null/missing as unset.
  res.json({ key: req.params.key, value: getSetting(req.params.key) });
});

app.post("/api/settings/:key", (req, res) => {
  const value = String((req.body as { value?: unknown })?.value ?? "");
  setSetting(req.params.key, value);
  res.json({ key: req.params.key, value });
});

/* ---------- Trips (saved custom trips) ---------- */

app.post("/api/trips/save", (req, res) => {
  const body = req.body as {
    templateId?: string;
    templateName?: string;
    settings?: unknown;
    isEditable?: boolean;
  };
  if (!body?.templateId || !body?.templateName) {
    res.status(400).json({ error: "templateId and templateName are required" });
    return;
  }
  const slug = newSlug();
  const editSlug = body.isEditable ? newSlug() : null;
  db.prepare(
    `INSERT INTO trips (slug, edit_slug, template_id, template_name, settings, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    slug,
    editSlug,
    body.templateId,
    body.templateName,
    JSON.stringify(body.settings ?? {}),
    now(),
  );
  res.json({ slug, ...(editSlug ? { editSlug } : {}) });
});

app.get("/api/trips", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM trips ORDER BY created_at DESC")
    .all() as TripRow[];
  res.json(rows.map((r) => tripToJson(r)));
});

app.get("/api/trips-csv", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM trips ORDER BY created_at DESC")
    .all() as TripRow[];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "slug,templateId,templateName,travelMonth,departureDate,isCompleted,createdAt,settings";
  const lines = rows.map((r) =>
    [
      r.slug,
      r.template_id,
      r.template_name,
      r.travel_month,
      r.departure_date,
      r.is_completed ? "true" : "false",
      r.created_at,
      r.settings,
    ]
      .map(esc)
      .join(","),
  );
  res
    .type("text/csv")
    .setHeader("Content-Disposition", 'attachment; filename="wanderlust-trips.csv"')
    .send([header, ...lines].join("\n"));
});

function findTripBySlug(slug: string): TripRow | undefined {
  return db.prepare("SELECT * FROM trips WHERE slug = ?").get(slug) as
    | TripRow
    | undefined;
}

app.get("/api/trips/:slug", (req, res) => {
  const row = findTripBySlug(req.params.slug);
  if (!row) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(tripToJson(row));
});

app.delete("/api/trips/:slug", (req, res) => {
  db.prepare("DELETE FROM trips WHERE slug = ?").run(req.params.slug);
  res.json({ success: true });
});

function patchTrip(
  slug: string,
  column: "travel_month" | "departure_date" | "is_completed",
  value: string | number | null,
  res: express.Response,
): void {
  const row = findTripBySlug(slug);
  if (!row) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  db.prepare(`UPDATE trips SET ${column} = ? WHERE slug = ?`).run(value, slug);
  res.json(tripToJson(findTripBySlug(slug) as TripRow));
}

app.patch("/api/trips/:slug/month", (req, res) => {
  const month = (req.body as { month?: string | null })?.month ?? null;
  patchTrip(req.params.slug, "travel_month", month, res);
});

app.patch("/api/trips/:slug/departure", (req, res) => {
  const date = (req.body as { date?: string | null })?.date ?? null;
  patchTrip(req.params.slug, "departure_date", date, res);
});

app.patch("/api/trips/:slug/complete", (req, res) => {
  const completed = (req.body as { completed?: boolean })?.completed;
  patchTrip(req.params.slug, "is_completed", completed ? 1 : 0, res);
});

/* ---------- Checklist ---------- */

app.get("/api/checklist/all", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM checklist_items ORDER BY template_id, sort_order, id")
    .all() as ChecklistRow[];
  res.json(rows.map(checklistToJson));
});

app.get("/api/checklist/:templateId", (req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM checklist_items WHERE template_id = ? ORDER BY sort_order, id",
    )
    .all(req.params.templateId) as ChecklistRow[];
  res.json(rows.map(checklistToJson));
});

app.post("/api/checklist", (req, res) => {
  const body = req.body as {
    templateId?: string;
    text?: string;
    completed?: boolean;
    sortOrder?: number;
    dueDate?: string | null;
    createdAt?: string;
  };
  if (!body?.templateId || !body?.text) {
    res.status(400).json({ error: "templateId and text are required" });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO checklist_items (template_id, text, completed, sort_order, due_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      body.templateId,
      body.text,
      body.completed ? 1 : 0,
      body.sortOrder ?? 0,
      body.dueDate ?? null,
      body.createdAt ?? now(),
    );
  const row = db
    .prepare("SELECT * FROM checklist_items WHERE id = ?")
    .get(info.lastInsertRowid) as ChecklistRow;
  res.json(checklistToJson(row));
});

app.patch("/api/checklist/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM checklist_items WHERE id = ?")
    .get(req.params.id) as ChecklistRow | undefined;
  if (!row) {
    res.status(404).json({ error: "Checklist item not found" });
    return;
  }
  const body = req.body as {
    completed?: boolean;
    text?: string;
    dueDate?: string | null;
    sortOrder?: number;
  };
  db.prepare(
    "UPDATE checklist_items SET completed = ?, text = ?, due_date = ?, sort_order = ? WHERE id = ?",
  ).run(
    body.completed !== undefined ? (body.completed ? 1 : 0) : row.completed,
    body.text ?? row.text,
    body.dueDate !== undefined ? body.dueDate : row.due_date,
    body.sortOrder ?? row.sort_order,
    row.id,
  );
  const updated = db
    .prepare("SELECT * FROM checklist_items WHERE id = ?")
    .get(row.id) as ChecklistRow;
  res.json(checklistToJson(updated));
});

app.delete("/api/checklist/:id", (req, res) => {
  db.prepare("DELETE FROM checklist_items WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ---------- Comments (on shared trips) ---------- */

app.get("/api/comments/:slug", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM comments WHERE slug = ? ORDER BY created_at, id")
    .all(req.params.slug) as CommentRow[];
  res.json(rows.map(commentToJson));
});

app.post("/api/comments/:slug", (req, res) => {
  const body = req.body as { authorName?: string; commentText?: string };
  if (!body?.authorName?.trim() || !body?.commentText?.trim()) {
    res.status(400).json({ error: "authorName and commentText are required" });
    return;
  }
  const info = db
    .prepare(
      "INSERT INTO comments (slug, author_name, comment_text, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(req.params.slug, body.authorName.trim(), body.commentText.trim(), now());
  const row = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(info.lastInsertRowid) as CommentRow;
  res.json(commentToJson(row));
});

/* ---------- Day notes (per trip template, per day) ---------- */

app.get("/api/day-notes/:tripId", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM day_notes WHERE trip_id = ? ORDER BY day_number")
    .all(req.params.tripId) as DayNoteRow[];
  res.json(rows.map(dayNoteToJson));
});

app.post("/api/day-notes/:tripId/:dayNumber", (req, res) => {
  const dayNumber = Number(req.params.dayNumber);
  if (!Number.isInteger(dayNumber)) {
    res.status(400).json({ error: "dayNumber must be an integer" });
    return;
  }
  const noteText = String((req.body as { noteText?: unknown })?.noteText ?? "");
  db.prepare(
    `INSERT INTO day_notes (trip_id, day_number, note_text, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(trip_id, day_number) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at`,
  ).run(req.params.tripId, dayNumber, noteText, now());
  const row = db
    .prepare("SELECT * FROM day_notes WHERE trip_id = ? AND day_number = ?")
    .get(req.params.tripId, dayNumber) as DayNoteRow;
  res.json(dayNoteToJson(row));
});

/* ---------- Journal notes (one per trip template) ---------- */

app.get("/api/notes", (_req, res) => {
  const rows = db.prepare("SELECT * FROM notes").all() as NoteRow[];
  res.json(rows.map(noteToJson));
});

app.post("/api/notes/:templateId", (req, res) => {
  const noteText = String((req.body as { noteText?: unknown })?.noteText ?? "");
  db.prepare(
    `INSERT INTO notes (template_id, note_text, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(template_id) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at`,
  ).run(req.params.templateId, noteText, now());
  const row = db
    .prepare("SELECT * FROM notes WHERE template_id = ?")
    .get(req.params.templateId) as NoteRow;
  res.json(noteToJson(row));
});

/* ---------- Notification preferences (flat boolean map) ---------- */

app.get("/api/notif-prefs", (_req, res) => {
  const rows = db.prepare("SELECT key, enabled FROM notif_prefs").all() as NotifPrefRow[];
  res.json(Object.fromEntries(rows.map((r) => [r.key, !!r.enabled])));
});

app.post("/api/notif-prefs", (req, res) => {
  const body = req.body as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "Expected an object of boolean prefs" });
    return;
  }
  const upsert = db.prepare(
    "INSERT INTO notif_prefs (key, enabled) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled",
  );
  const save = db.transaction((entries: [string, unknown][]) => {
    for (const [key, val] of entries) upsert.run(key, val ? 1 : 0);
  });
  save(Object.entries(body));
  const rows = db.prepare("SELECT key, enabled FROM notif_prefs").all() as NotifPrefRow[];
  res.json(Object.fromEntries(rows.map((r) => [r.key, !!r.enabled])));
});

/* ---------- Ratings (one per trip template) ---------- */

app.get("/api/ratings", (_req, res) => {
  const rows = db.prepare("SELECT * FROM ratings").all() as RatingRow[];
  res.json(rows.map(ratingToJson));
});

app.post("/api/ratings/:templateId", (req, res) => {
  const body = req.body as { stars?: number; review?: string };
  const stars = Number(body?.stars);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    res.status(400).json({ error: "stars must be between 1 and 5" });
    return;
  }
  db.prepare(
    `INSERT INTO ratings (template_id, stars, review, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(template_id) DO UPDATE SET stars = excluded.stars, review = excluded.review, created_at = excluded.created_at`,
  ).run(req.params.templateId, stars, body?.review ?? null, now());
  const row = db
    .prepare("SELECT * FROM ratings WHERE template_id = ?")
    .get(req.params.templateId) as RatingRow;
  res.json(ratingToJson(row));
});

/* ---------- Shared editable trips ---------- */

function findTripByEditSlug(editSlug: string): TripRow | undefined {
  return db.prepare("SELECT * FROM trips WHERE edit_slug = ?").get(editSlug) as
    | TripRow
    | undefined;
}

app.get("/api/edit/:editSlug", (req, res) => {
  const row = findTripByEditSlug(req.params.editSlug);
  if (!row) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(tripToJson(row, true));
});

app.post("/api/edit/:editSlug/notes", (req, res) => {
  const row = findTripByEditSlug(req.params.editSlug);
  if (!row) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const notes = String((req.body as { notes?: unknown })?.notes ?? "");
  db.prepare("UPDATE trips SET notes = ? WHERE id = ?").run(notes, row.id);
  res.json(tripToJson(findTripByEditSlug(req.params.editSlug) as TripRow, true));
});

/* ---------- Gas prices ---------- */
// No live upstream API — serve settings overrides (gas_route66_avg /
// gas_northern_parks_avg) or the 3.85 default, always isLive: false.

const DEFAULT_GAS_PRICE = 3.85;

app.get("/api/gas-prices", (_req, res) => {
  const route66Avg = Number(getSetting("gas_route66_avg")) || DEFAULT_GAS_PRICE;
  const northernParksAvg =
    Number(getSetting("gas_northern_parks_avg")) || DEFAULT_GAS_PRICE;
  res.json({
    date: new Date().toISOString().slice(0, 10),
    route66Avg,
    northernParksAvg,
    isLive: false,
  });
});

/* ---------- Group trip plans ---------- */

const MEMBER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

/** Short, unambiguous join code (no 0/O/1/I). */
function makeJoinCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

function planMembers(planId: string): PlanMemberRow[] {
  return db
    .prepare("SELECT * FROM plan_members WHERE plan_id = ? ORDER BY id ASC")
    .all(planId) as PlanMemberRow[];
}

/** Full plan payload: everything the group hub needs in one round trip. */
function planPayload(planId: string) {
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(planId) as
    | PlanRow
    | undefined;
  if (!plan) return null;
  const members = planMembers(planId);
  const dates = db
    .prepare("SELECT * FROM plan_dates WHERE plan_id = ?")
    .all(planId) as PlanDateRow[];
  const expenses = db
    .prepare("SELECT * FROM plan_expenses WHERE plan_id = ? ORDER BY id DESC")
    .all(planId) as PlanExpenseRow[];
  const assignments = db
    .prepare("SELECT * FROM plan_assignments WHERE plan_id = ? ORDER BY id ASC")
    .all(planId) as PlanAssignmentRow[];
  const journal = db
    .prepare("SELECT * FROM plan_journal WHERE plan_id = ? ORDER BY id DESC")
    .all(planId) as PlanJournalRow[];

  return {
    id: plan.id,
    templateId: plan.template_id,
    title: plan.title,
    settings: JSON.parse(plan.settings),
    startDate: plan.start_date,
    isPublished: !!plan.is_published,
    blurb: plan.blurb,
    forkCount: plan.fork_count,
    forkedFrom: plan.forked_from,
    createdAt: plan.created_at,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      joinedAt: m.joined_at,
    })),
    availability: dates.map((d) => ({ memberId: d.member_id, day: d.day })),
    expenses: expenses.map((e) => ({
      id: e.id,
      payerId: e.payer_id,
      description: e.description,
      amount: e.amount_cents / 100,
      splitIds: JSON.parse(e.split_ids) as number[],
      category: e.category,
      dayNumber: e.day_number,
      createdAt: e.created_at,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      label: a.label,
      category: a.category,
      assigneeId: a.assignee_id,
      done: !!a.done,
    })),
    journal: journal.map((j) => ({
      id: j.id,
      memberId: j.member_id,
      dayNumber: j.day_number,
      text: j.text,
      createdAt: j.created_at,
    })),
  };
}

function touchPlan(planId: string) {
  db.prepare("UPDATE plans SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    planId,
  );
}

// Create a plan (optionally seeding the creator as the first member).
app.post("/api/plans", (req, res) => {
  const { templateId, title, settings, ownerName } = req.body ?? {};
  if (!templateId || !title) {
    return res.status(400).json({ error: "templateId and title are required" });
  }
  const now = new Date().toISOString();
  let id = makeJoinCode();
  while (db.prepare("SELECT id FROM plans WHERE id = ?").get(id)) id = makeJoinCode();

  db.prepare(
    `INSERT INTO plans (id, template_id, title, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, templateId, title, JSON.stringify(settings ?? {}), now, now);

  if (ownerName) {
    db.prepare(
      "INSERT INTO plan_members (plan_id, name, color, joined_at) VALUES (?, ?, ?, ?)",
    ).run(id, String(ownerName).slice(0, 40), MEMBER_COLORS[0], now);
  }
  res.json(planPayload(id));
});

app.get("/api/plans/:id", (req, res) => {
  const payload = planPayload(req.params.id.toUpperCase());
  if (!payload) return res.status(404).json({ error: "Plan not found" });
  res.json(payload);
});

app.patch("/api/plans/:id", (req, res) => {
  const id = req.params.id.toUpperCase();
  const plan = db.prepare("SELECT id FROM plans WHERE id = ?").get(id);
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  const { title, settings, startDate, isPublished, blurb } = req.body ?? {};
  if (title !== undefined)
    db.prepare("UPDATE plans SET title = ? WHERE id = ?").run(title, id);
  if (settings !== undefined)
    db.prepare("UPDATE plans SET settings = ? WHERE id = ?").run(
      JSON.stringify(settings),
      id,
    );
  if (startDate !== undefined)
    db.prepare("UPDATE plans SET start_date = ? WHERE id = ?").run(startDate, id);
  if (isPublished !== undefined)
    db.prepare("UPDATE plans SET is_published = ? WHERE id = ?").run(
      isPublished ? 1 : 0,
      id,
    );
  if (blurb !== undefined)
    db.prepare("UPDATE plans SET blurb = ? WHERE id = ?").run(blurb, id);
  touchPlan(id);
  res.json(planPayload(id));
});

// Join a plan by name — no account required, which is the whole point.
app.post("/api/plans/:id/members", (req, res) => {
  const id = req.params.id.toUpperCase();
  if (!db.prepare("SELECT id FROM plans WHERE id = ?").get(id))
    return res.status(404).json({ error: "Plan not found" });
  const name = String(req.body?.name ?? "").trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: "name is required" });

  const existing = planMembers(id);
  const already = existing.find(
    (m) => m.name.toLowerCase() === name.toLowerCase(),
  );
  if (already) return res.json({ member: { id: already.id, name: already.name, color: already.color }, plan: planPayload(id) });

  const color = MEMBER_COLORS[existing.length % MEMBER_COLORS.length];
  const info = db
    .prepare("INSERT INTO plan_members (plan_id, name, color, joined_at) VALUES (?, ?, ?, ?)")
    .run(id, name, color, new Date().toISOString());
  touchPlan(id);
  res.json({
    member: { id: Number(info.lastInsertRowid), name, color },
    plan: planPayload(id),
  });
});

app.delete("/api/plans/:id/members/:memberId", (req, res) => {
  const id = req.params.id.toUpperCase();
  const memberId = Number(req.params.memberId);
  db.prepare("DELETE FROM plan_members WHERE plan_id = ? AND id = ?").run(id, memberId);
  db.prepare("DELETE FROM plan_dates WHERE plan_id = ? AND member_id = ?").run(id, memberId);
  touchPlan(id);
  res.json(planPayload(id));
});

// Replace one member's availability in a single call.
app.put("/api/plans/:id/availability/:memberId", (req, res) => {
  const id = req.params.id.toUpperCase();
  const memberId = Number(req.params.memberId);
  const days: string[] = Array.isArray(req.body?.days) ? req.body.days : [];
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM plan_dates WHERE plan_id = ? AND member_id = ?").run(id, memberId);
    const insert = db.prepare(
      "INSERT OR IGNORE INTO plan_dates (plan_id, member_id, day) VALUES (?, ?, ?)",
    );
    for (const day of days) insert.run(id, memberId, String(day).slice(0, 10));
  });
  tx();
  touchPlan(id);
  res.json(planPayload(id));
});

app.post("/api/plans/:id/expenses", (req, res) => {
  const id = req.params.id.toUpperCase();
  const { payerId, description, amount, splitIds, category, dayNumber } = req.body ?? {};
  if (!payerId || !description || typeof amount !== "number") {
    return res.status(400).json({ error: "payerId, description and amount are required" });
  }
  db.prepare(
    `INSERT INTO plan_expenses (plan_id, payer_id, description, amount_cents, split_ids, category, day_number, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    payerId,
    String(description).slice(0, 120),
    Math.round(amount * 100),
    JSON.stringify(Array.isArray(splitIds) ? splitIds : []),
    category ?? null,
    dayNumber ?? null,
    new Date().toISOString(),
  );
  touchPlan(id);
  res.json(planPayload(id));
});

app.delete("/api/plans/:id/expenses/:expenseId", (req, res) => {
  const id = req.params.id.toUpperCase();
  db.prepare("DELETE FROM plan_expenses WHERE plan_id = ? AND id = ?").run(
    id,
    Number(req.params.expenseId),
  );
  touchPlan(id);
  res.json(planPayload(id));
});

app.post("/api/plans/:id/assignments", (req, res) => {
  const id = req.params.id.toUpperCase();
  const { label, category, assigneeId } = req.body ?? {};
  if (!label) return res.status(400).json({ error: "label is required" });
  db.prepare(
    `INSERT INTO plan_assignments (plan_id, label, category, assignee_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, String(label).slice(0, 120), category ?? "todo", assigneeId ?? null, new Date().toISOString());
  touchPlan(id);
  res.json(planPayload(id));
});

app.patch("/api/plans/:id/assignments/:assignmentId", (req, res) => {
  const id = req.params.id.toUpperCase();
  const aid = Number(req.params.assignmentId);
  const { assigneeId, done, label } = req.body ?? {};
  if (assigneeId !== undefined)
    db.prepare("UPDATE plan_assignments SET assignee_id = ? WHERE plan_id = ? AND id = ?").run(assigneeId, id, aid);
  if (done !== undefined)
    db.prepare("UPDATE plan_assignments SET done = ? WHERE plan_id = ? AND id = ?").run(done ? 1 : 0, id, aid);
  if (label !== undefined)
    db.prepare("UPDATE plan_assignments SET label = ? WHERE plan_id = ? AND id = ?").run(label, id, aid);
  touchPlan(id);
  res.json(planPayload(id));
});

app.delete("/api/plans/:id/assignments/:assignmentId", (req, res) => {
  const id = req.params.id.toUpperCase();
  db.prepare("DELETE FROM plan_assignments WHERE plan_id = ? AND id = ?").run(
    id,
    Number(req.params.assignmentId),
  );
  touchPlan(id);
  res.json(planPayload(id));
});

app.post("/api/plans/:id/journal", (req, res) => {
  const id = req.params.id.toUpperCase();
  const { memberId, dayNumber, text } = req.body ?? {};
  if (!text) return res.status(400).json({ error: "text is required" });
  db.prepare(
    "INSERT INTO plan_journal (plan_id, member_id, day_number, text, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, memberId ?? null, dayNumber ?? null, String(text).slice(0, 2000), new Date().toISOString());
  touchPlan(id);
  res.json(planPayload(id));
});

app.delete("/api/plans/:id/journal/:entryId", (req, res) => {
  const id = req.params.id.toUpperCase();
  db.prepare("DELETE FROM plan_journal WHERE plan_id = ? AND id = ?").run(
    id,
    Number(req.params.entryId),
  );
  touchPlan(id);
  res.json(planPayload(id));
});

/* ---------- Discover: published plans ---------- */

app.get("/api/discover", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id) AS member_count
       FROM plans p WHERE p.is_published = 1 ORDER BY p.updated_at DESC LIMIT 60`,
    )
    .all() as (PlanRow & { member_count: number })[];
  res.json(
    rows.map((p) => ({
      id: p.id,
      templateId: p.template_id,
      title: p.title,
      blurb: p.blurb,
      settings: JSON.parse(p.settings),
      startDate: p.start_date,
      forkCount: p.fork_count,
      memberCount: p.member_count,
      updatedAt: p.updated_at,
    })),
  );
});

// Fork a published plan into a fresh one you own.
app.post("/api/plans/:id/fork", (req, res) => {
  const sourceId = req.params.id.toUpperCase();
  const source = db.prepare("SELECT * FROM plans WHERE id = ?").get(sourceId) as
    | PlanRow
    | undefined;
  if (!source) return res.status(404).json({ error: "Plan not found" });

  const now = new Date().toISOString();
  let id = makeJoinCode();
  while (db.prepare("SELECT id FROM plans WHERE id = ?").get(id)) id = makeJoinCode();

  db.prepare(
    `INSERT INTO plans (id, template_id, title, settings, forked_from, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, source.template_id, source.title, source.settings, sourceId, now, now);

  // Carry over the itinerary scaffolding (assignments), not the group's people or money.
  const assignments = db
    .prepare("SELECT label, category FROM plan_assignments WHERE plan_id = ?")
    .all(sourceId) as { label: string; category: string }[];
  const insert = db.prepare(
    "INSERT INTO plan_assignments (plan_id, label, category, created_at) VALUES (?, ?, ?, ?)",
  );
  for (const a of assignments) insert.run(id, a.label, a.category, now);

  db.prepare("UPDATE plans SET fork_count = fork_count + 1 WHERE id = ?").run(sourceId);

  const ownerName = String(req.body?.ownerName ?? "").trim().slice(0, 40);
  if (ownerName) {
    db.prepare(
      "INSERT INTO plan_members (plan_id, name, color, joined_at) VALUES (?, ?, ?, ?)",
    ).run(id, ownerName, MEMBER_COLORS[0], now);
  }
  res.json(planPayload(id));
});

/* ---------- Custom trips (user-authored templates) ---------- */

// Each row stores the full Trip JSON object under `data`. The frontend merges
// these with the 7 built-in templates so custom trips flow through every page.
app.get("/api/custom-trips", (_req, res) => {
  const rows = db
    .prepare("SELECT data FROM custom_trips ORDER BY created_at ASC")
    .all() as Pick<CustomTripRow, "data">[];
  res.json(rows.map((r) => JSON.parse(r.data)));
});

app.post("/api/custom-trips", (req, res) => {
  const trip = req.body;
  if (!trip || typeof trip !== "object" || !trip.name) {
    return res.status(400).json({ error: "Invalid trip" });
  }
  const now = new Date().toISOString();
  // Always assign a server-side id so custom trips can't collide with built-ins.
  const id = `custom_${randomBytes(6).toString("hex")}`;
  const data = { ...trip, id, isCustom: true };
  db.prepare(
    "INSERT INTO custom_trips (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)",
  ).run(id, JSON.stringify(data), now, now);
  res.json(data);
});

app.put("/api/custom-trips/:id", (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare("SELECT id FROM custom_trips WHERE id = ?")
    .get(id) as { id: string } | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });
  const data = { ...req.body, id, isCustom: true };
  db.prepare(
    "UPDATE custom_trips SET data = ?, updated_at = ? WHERE id = ?",
  ).run(JSON.stringify(data), new Date().toISOString(), id);
  res.json(data);
});

app.delete("/api/custom-trips/:id", (req, res) => {
  db.prepare("DELETE FROM custom_trips WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ---------- 404 for unknown API routes ---------- */

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/* ---------- Static client (production) ---------- */

if (process.env.NODE_ENV === "production") {
  const clientDir = path.resolve(__dirname, "..", "dist", "client");
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(clientDir, "index.html"));
    });
  } else {
    console.warn(`Static client dir not found: ${clientDir}`);
  }
}

const PORT = Number(process.env.PORT) || 5001;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
