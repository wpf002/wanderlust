import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Square,
  List,
  CalendarDays,
  Calendar,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";
import { trips } from "@/data/trips";
import { apiRequest } from "@/lib/api";
import type { ChecklistItem } from "@/lib/checklist";
import Navbar from "@/components/Navbar";

/** Suggested starter tasks per trip type (bundle `Xj`). */
const SUGGESTED_TASKS: Record<string, string[]> = {
  road_trip: [
    "Book hotels for all overnight stops",
    "Get vehicle oil change & tire check",
    "Pack emergency road kit",
    "Download offline maps",
    "Set daily driving limits",
    "Pack first-aid kit",
    "Check car insurance coverage",
    "Load up on snacks & drinks",
    "Confirm gas buddy app",
    "Research gas prices by state",
  ],
  international: [
    "Book flights (round-trip)",
    "Check passport validity (6+ months)",
    "Apply for ETIAS / visa if required",
    "Get travel insurance",
    "Notify bank of travel dates",
    "Book hotels for all cities",
    "Download offline translation app",
    "Research local transportation",
    "Pack universal power adapter",
    "Make copies of important documents",
  ],
};

/** Format an ISO date (YYYY-MM-DD) for display (bundle `jOe`). */
function formatDueDate(date: string | null): string {
  return date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

/** Whether a due date is in the past (bundle `$Oe`). */
function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date + "T00:00:00") < today;
}

interface CardTemplate {
  id: string;
  name: string;
  emoji: string;
  type: string;
}

/** Per-trip collapsible checklist card (bundle `UOe`). */
function TripChecklistCard({ template }: { template: CardTemplate }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: items = [], isLoading } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist", template.id],
  });

  const completed = items.filter((it) => it.completed).length;
  const percent =
    items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/api/checklist", template.id],
    });

  const toggleItem = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/checklist/${id}`, { completed }).then((r) =>
        r.json(),
      ),
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/checklist/${id}`).then((r) => r.json()),
    onSuccess: invalidate,
  });

  const addItem = useMutation({
    mutationFn: (body: {
      templateId: string;
      text: string;
      dueDate: string | null;
    }) => apiRequest("POST", "/api/checklist", body).then((r) => r.json()),
    onSuccess: () => {
      invalidate();
      setNewText("");
      setNewDate("");
      setAdding(false);
    },
  });

  const seedTasks = useMutation({
    mutationFn: async () => {
      const tasks = SUGGESTED_TASKS[template.type] || SUGGESTED_TASKS.road_trip;
      for (let i = 0; i < tasks.length; i++) {
        await apiRequest("POST", "/api/checklist", {
          templateId: template.id,
          text: tasks[i],
          sortOrder: i,
        });
      }
    },
    onSuccess: invalidate,
  });

  const accent =
    template.type === "road_trip"
      ? "text-amber-600 dark:text-amber-400"
      : "text-blue-600 dark:text-blue-400";
  const barColor =
    percent === 100
      ? "bg-emerald-500"
      : percent > 50
        ? "bg-amber-500"
        : "bg-[var(--color-primary)]";

  function submitNew() {
    if (newText.trim()) {
      addItem.mutate({
        templateId: template.id,
        text: newText.trim(),
        dueDate: newDate || null,
      });
    }
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <button
        data-testid={`checklist-header-${template.id}`}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-[var(--color-surface-offset)]/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-2xl shrink-0">{template.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{template.name}</div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-1.5 bg-[var(--color-surface-offset)] rounded-full overflow-hidden max-w-[160px]">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {isLoading ? "…" : `${completed}/${items.length}`}
            </span>
            {percent === 100 && items.length > 0 && (
              <span className="whitespace-nowrap inline-flex items-center rounded-md px-2.5 py-0 text-xs font-semibold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 border">
                Done
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp
            size={16}
            className="text-[var(--color-text-muted)] shrink-0"
          />
        ) : (
          <ChevronDown
            size={16}
            className="text-[var(--color-text-muted)] shrink-0"
          />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] p-5 space-y-3">
          {!isLoading && items.length === 0 && (
            <div className="text-center py-4">
              <ClipboardList
                size={28}
                className="mx-auto text-[var(--color-text-faint)] mb-2"
              />
              <p className="text-sm text-[var(--color-text-muted)]">
                No tasks yet
              </p>
              <button
                data-testid={`checklist-seed-${template.id}`}
                onClick={() => seedTasks.mutate()}
                disabled={seedTasks.isPending}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                {seedTasks.isPending ? "Adding…" : "Add suggested tasks"}
              </button>
            </div>
          )}

          {items.map((item) => {
            const overdue = !item.completed && isOverdue(item.dueDate);
            return (
              <div
                key={item.id}
                data-testid={`checklist-item-${item.id}`}
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${item.completed ? "opacity-50" : "hover:bg-[var(--color-surface-offset)]/50"}`}
              >
                <button
                  data-testid={`checklist-toggle-${item.id}`}
                  onClick={() =>
                    toggleItem.mutate({
                      id: item.id,
                      completed: !item.completed,
                    })
                  }
                  className={`shrink-0 mt-0.5 transition-colors ${accent}`}
                  aria-label={
                    item.completed ? "Mark incomplete" : "Mark complete"
                  }
                >
                  {item.completed ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${item.completed ? "line-through text-[var(--color-text-faint)]" : ""}`}
                  >
                    {item.text}
                  </span>
                  {item.dueDate && (
                    <div
                      className={`flex items-center gap-1 text-xs mt-0.5 ${overdue ? "text-red-500" : "text-[var(--color-text-faint)]"}`}
                    >
                      {overdue && <AlertTriangle size={10} />}
                      <Calendar size={10} />
                      {overdue ? "Overdue · " : ""}
                      {formatDueDate(item.dueDate)}
                    </div>
                  )}
                </div>
                <button
                  data-testid={`checklist-delete-${item.id}`}
                  onClick={() => deleteItem.mutate(item.id)}
                  className="shrink-0 p-1 rounded-lg text-[var(--color-text-faint)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  aria-label="Delete task"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {adding ? (
            <div className="pt-2 space-y-2 border-t border-[var(--color-divider)]">
              <input
                data-testid={`checklist-new-text-${template.id}`}
                autoFocus
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNew();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="Task description…"
                className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <button
                  data-testid={`checklist-save-${template.id}`}
                  onClick={submitNew}
                  disabled={!newText.trim() || addItem.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                >
                  {addItem.isPending ? "Saving…" : "Add"}
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              data-testid={`checklist-add-${template.id}`}
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-2 rounded-xl hover:bg-[var(--color-surface-offset)]/50 transition-colors border border-dashed border-[var(--color-border)]"
            >
              <Plus size={13} /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const CALENDAR_TEMPLATE_IDS = [
  "route66",
  "northern_parks",
  "interstate",
  "italy_west_coast",
  "pacific_coast",
  "gulf_coast",
  "scotland_ireland",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month calendar of every checklist item's due date (bundle `BOe`). */
function ChecklistCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const { data: items = [] } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist/all"],
    queryFn: () =>
      Promise.all(
        CALENDAR_TEMPLATE_IDS.map((id) =>
          apiRequest("GET", `/api/checklist/${id}`).then((r) => r.json()),
        ),
      ).then((lists: ChecklistItem[][]) => lists.flat()),
  });

  const byDate = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {};
    for (const item of items) {
      if (item.dueDate) {
        (map[item.dueDate] = map[item.dueDate] || []).push(item);
      }
    }
    return map;
  }, [items]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (day: number) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
        >
          ← Prev
        </button>
        <span className="font-semibold text-sm">{monthLabel}</span>
        <button
          onClick={() =>
            setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-semibold text-[var(--color-text-muted)] py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-[var(--color-border)]">
        {cells.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={index}
                className="bg-[var(--color-bg)] min-h-[72px]"
              />
            );
          }
          const key = dateKey(day);
          const dayItems = byDate[key] || [];
          const isToday =
            new Date(key + "T00:00:00").getTime() === today.getTime();
          const isPast = new Date(key + "T00:00:00") < today;
          const hasOverdue = isPast && dayItems.some((it) => !it.completed);
          return (
            <div
              key={index}
              data-testid={`cal-day-${key}`}
              className={`bg-[var(--color-surface)] min-h-[72px] p-1.5 ${isToday ? "ring-1 ring-inset ring-[var(--color-primary)]" : ""}`}
            >
              <div
                className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-[var(--color-primary)] text-white" : hasOverdue ? "text-red-500" : "text-[var(--color-text-muted)]"}`}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <div
                    key={it.id}
                    className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${it.completed ? "text-[var(--color-text-faint)] line-through" : isPast ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"}`}
                    title={it.text}
                  >
                    {it.text}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[9px] text-[var(--color-text-faint)] px-1">
                    +{dayItems.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-500/20 border border-amber-300/60 dark:border-amber-500/30 block" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-500/20 border border-red-300/60 dark:border-red-500/30 block" />
          Overdue
        </span>
      </div>
    </div>
  );
}

/** Trip Checklists page (bundle `HOe`). */
export default function ChecklistPage() {
  const [tab, setTab] = useState<"list" | "calendar">("list");

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
      active
        ? "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    }`;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl mb-1 flex items-center gap-2">
            <CheckSquare size={22} className="text-[var(--color-primary)]" />
            Trip Checklists
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Track pre-trip tasks for each destination. Check off items as you
            prepare.
          </p>
        </div>

        <div className="flex items-center gap-1 mb-4">
          <button
            data-testid="tab-checklist-list"
            className={tabClass(tab === "list")}
            onClick={() => setTab("list")}
          >
            <List size={12} /> By Trip
          </button>
          <button
            data-testid="tab-checklist-calendar"
            className={tabClass(tab === "calendar")}
            onClick={() => setTab("calendar")}
          >
            <CalendarDays size={12} /> Calendar
          </button>
        </div>

        {tab === "list" ? (
          <div className="space-y-4 mt-0">
            {trips.map((trip) => (
              <TripChecklistCard
                key={trip.id}
                template={{
                  id: trip.id,
                  name: trip.name,
                  emoji: trip.emoji,
                  type: trip.type,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-0">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <ChecklistCalendar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
