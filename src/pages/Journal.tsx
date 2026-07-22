import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, ArrowRight, Clock, Check, Save } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { trips } from "@/data/trips";
import Navbar from "@/components/Navbar";

// The markdown editor and its stylesheets are heavy; load them only on /notes.
const MarkdownEditor = lazy(() => import("./notes/MarkdownEditor"));

interface JournalNote {
  id: number;
  templateId: string;
  noteText: string;
  updatedAt: string;
}

const QUICK_PROMPTS = [
  "📅 Travel dates: ",
  "🏨 Hotel picks: ",
  "🍽️ Must-eat: ",
  "⛽ Gas strategy: ",
  "📦 Packing notes: ",
  "💰 Budget target: ",
];

/** Bundle `MOe`: "Saved <date> at <time>" (or "Never saved"). */
function formatSavedAt(value: string | undefined): string {
  if (!value) return "Never saved";
  const d = new Date(value);
  return `Saved ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** `/notes` — per-template markdown trip journal (bundle `FOe`). */
export default function JournalPage() {
  const [, navigate] = useLocation();
  const [activeId, setActiveId] = useState(trips[0].id);
  const [notes, setNotes] = useState<Record<string, JournalNote>>({});
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiRequest("GET", "/api/notes")
      .then(async (r) => {
        const rows: JournalNote[] = await r.json();
        const map: Record<string, JournalNote> = {};
        rows.forEach((n) => {
          map[n.templateId] = n;
        });
        setNotes(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const existing = notes[activeId];
    setDraft(existing?.noteText ?? "");
    setSaved(false);
  }, [activeId, notes]);

  async function save(value?: string) {
    const text = value !== undefined ? value : draft;
    setSaving(true);
    try {
      const updated: JournalNote = await (
        await apiRequest("POST", `/api/notes/${activeId}`, { noteText: text })
      ).json();
      setNotes((prev) => ({ ...prev, [activeId]: updated }));
      setSaved(true);
    } catch {
      // ignore — the draft is preserved for a manual retry
    }
    setSaving(false);
  }

  function handleChange(value: string) {
    setDraft(value);
    setSaved(false);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(value), 2000);
  }

  const activeTrip = trips.find((t) => t.id === activeId) || trips[0];
  const activeNote = notes[activeId];
  const hasText = (text: string | undefined) =>
    !!text && text.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <BookOpen size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl">Trip Journal</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Personal notes for each trip template
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Your Trips
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {trips.map((trip) => {
                const note = notes[trip.id];
                const isActive = activeId === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => setActiveId(trip.id)}
                    data-testid={`note-trip-${trip.id}`}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)]/8 border-l-2 border-[var(--color-primary)]"
                        : "hover:bg-[var(--color-surface-offset)]/60"
                    }`}
                  >
                    <span className="text-xl shrink-0">{trip.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-[var(--color-primary)]" : ""
                        }`}
                      >
                        {trip.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-faint)] mt-0.5 truncate">
                        {note && hasText(note.noteText)
                          ? `${note.noteText.trim().substring(0, 40)}${
                              note.noteText.trim().length > 40 ? "…" : ""
                            }`
                          : "No notes yet"}
                      </div>
                    </div>
                    {note && hasText(note.noteText) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeTrip.emoji}</span>
                  <div>
                    <h2 className="font-display font-bold text-base">
                      {activeTrip.name}
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {activeTrip.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/trip/${activeId}`)}
                  data-testid="notes-view-trip"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  View Itinerary <ArrowRight size={10} />
                </button>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex-1">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                  Notes
                </span>
                <div className="flex items-center gap-2">
                  {activeNote?.updatedAt && (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-faint)]">
                      <Clock size={10} />
                      {formatSavedAt(activeNote.updatedAt)}
                    </span>
                  )}
                  <button
                    onClick={() => save()}
                    data-testid="notes-save-btn"
                    disabled={saving}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      saved
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-[var(--color-primary)] text-white hover:opacity-90"
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check size={11} /> Saved
                      </>
                    ) : (
                      <>
                        <Save size={11} /> Save
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div
                data-testid="notes-editor"
                data-color-mode="auto"
                className="px-3 py-3"
              >
                <Suspense
                  fallback={
                    <div className="h-[380px] rounded-lg bg-[var(--color-surface-offset)] animate-pulse" />
                  }
                >
                  <MarkdownEditor
                    value={draft}
                    onChange={(value) => handleChange(value)}
                  />
                </Suspense>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2.5">
                Quick prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      const next = draft ? `${draft}\n\n${prompt}` : prompt;
                      setDraft(next);
                      setSaved(false);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-surface-offset)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors"
                  >
                    {prompt.replace(": ", "")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
