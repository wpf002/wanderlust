import Database, { type Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATA_DIR lets a deploy point the database at a persistent volume (e.g. a
// Railway volume mounted at /data). Defaults to the server directory in dev.
const dataDir = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDir, { recursive: true });

/** SQLite database file (gitignored via server/*.db). */
export const db: DatabaseType = new Database(path.join(dataDir, "wanderlust.db"));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS trips (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  edit_slug      TEXT UNIQUE,
  template_id    TEXT NOT NULL,
  template_name  TEXT NOT NULL,
  settings       TEXT NOT NULL,
  notes          TEXT NOT NULL DEFAULT '',
  travel_month   TEXT,
  departure_date TEXT,
  is_completed   INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  text        TEXT NOT NULL,
  completed   INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  due_date    TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  note_text  TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE (trip_id, day_number)
);

CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL UNIQUE,
  note_text   TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL UNIQUE,
  stars       INTEGER NOT NULL,
  review      TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notif_prefs (
  key     TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS custom_trips (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

/* ---- Group trip plans ------------------------------------------------
   A "plan" is one group's instance of a trip: the shared, persistent thing
   a set of friends coordinates around. Everything below hangs off it. */

CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY,           -- short join code, used in the share URL
  template_id TEXT NOT NULL,              -- built-in or custom trip id
  title       TEXT NOT NULL,
  settings    TEXT NOT NULL,              -- JSON cost settings
  start_date  TEXT,                       -- chosen departure once locked in
  is_published INTEGER NOT NULL DEFAULT 0,
  blurb       TEXT,
  fork_count  INTEGER NOT NULL DEFAULT 0,
  forked_from TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_members (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id   TEXT NOT NULL,
  name      TEXT NOT NULL,
  color     TEXT NOT NULL,
  joined_at TEXT NOT NULL
);

-- One row per member per date they're available (date poll).
CREATE TABLE IF NOT EXISTS plan_dates (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id   TEXT NOT NULL,
  member_id INTEGER NOT NULL,
  day       TEXT NOT NULL,
  UNIQUE (plan_id, member_id, day)
);

CREATE TABLE IF NOT EXISTS plan_expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id     TEXT NOT NULL,
  payer_id    INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  split_ids   TEXT NOT NULL,              -- JSON array of member ids sharing it
  category    TEXT,
  day_number  INTEGER,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id     TEXT NOT NULL,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'todo',
  assignee_id INTEGER,
  done        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_journal (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id    TEXT NOT NULL,
  member_id  INTEGER,
  day_number INTEGER,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

/* ---------- Row types ---------- */

export interface SettingRow {
  key: string;
  value: string | null;
}

export interface TripRow {
  id: number;
  slug: string;
  edit_slug: string | null;
  template_id: string;
  template_name: string;
  settings: string;
  notes: string;
  travel_month: string | null;
  departure_date: string | null;
  is_completed: number;
  created_at: string;
}

export interface ChecklistRow {
  id: number;
  template_id: string;
  text: string;
  completed: number;
  sort_order: number;
  due_date: string | null;
  created_at: string;
}

export interface CommentRow {
  id: number;
  slug: string;
  author_name: string;
  comment_text: string;
  created_at: string;
}

export interface DayNoteRow {
  id: number;
  trip_id: string;
  day_number: number;
  note_text: string;
  updated_at: string;
}

export interface NoteRow {
  id: number;
  template_id: string;
  note_text: string;
  updated_at: string;
}

export interface RatingRow {
  id: number;
  template_id: string;
  stars: number;
  review: string | null;
  created_at: string;
}

export interface NotifPrefRow {
  key: string;
  enabled: number;
}

export interface CustomTripRow {
  id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: string;
  template_id: string;
  title: string;
  settings: string;
  start_date: string | null;
  is_published: number;
  blurb: string | null;
  fork_count: number;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanMemberRow {
  id: number;
  plan_id: string;
  name: string;
  color: string;
  joined_at: string;
}

export interface PlanDateRow {
  id: number;
  plan_id: string;
  member_id: number;
  day: string;
}

export interface PlanExpenseRow {
  id: number;
  plan_id: string;
  payer_id: number;
  description: string;
  amount_cents: number;
  split_ids: string;
  category: string | null;
  day_number: number | null;
  created_at: string;
}

export interface PlanAssignmentRow {
  id: number;
  plan_id: string;
  label: string;
  category: string;
  assignee_id: number | null;
  done: number;
  created_at: string;
}

export interface PlanJournalRow {
  id: number;
  plan_id: string;
  member_id: number | null;
  day_number: number | null;
  text: string;
  created_at: string;
}

/* ---------- Helpers ---------- */

export function getSetting(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string | null } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
