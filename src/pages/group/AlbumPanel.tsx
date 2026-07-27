import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { plansApi, type PlanMember, type PlanPhoto } from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5";
const INPUT =
  "w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";
const SMALL_SELECT =
  "text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

/** Mirrors the server's allow-list — anything else is rejected before upload. */
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const ALLOWED = new Set(ACCEPT.split(","));
const MAX_BYTES = 12 * 1024 * 1024;

/** Fallback shape for photos uploaded before we started storing dimensions. */
const FALLBACK_RATIO = "4 / 3";

function Avatar({ member }: { member: PlanMember | undefined }) {
  const label = member?.name ?? "?";
  return (
    <span
      className="w-6 h-6 rounded-full shrink-0 grid place-items-center text-[10px] font-bold text-white"
      style={{ backgroundColor: member?.color ?? "var(--color-text-faint)" }}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

function ratioOf(photo: PlanPhoto): string {
  return photo.width && photo.height
    ? `${photo.width} / ${photo.height}`
    : FALLBACK_RATIO;
}

/**
 * Decode just enough of the file to learn its natural size, so the grid can
 * reserve the right box before the real image arrives. Never rejects — a
 * missing size only costs us a bit of layout shift.
 */
function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(size.width && size.height ? size : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Day buckets in trip order, with the undated pile last. */
function groupByDay(photos: PlanPhoto[]) {
  const groups = new Map<number | null, PlanPhoto[]>();
  for (const photo of photos) {
    const key = photo.dayNumber ?? null;
    const bucket = groups.get(key);
    if (bucket) bucket.push(photo);
    else groups.set(key, [photo]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });
}

/* ------------------------------------------------------------------ */
/* Tile                                                                */
/* ------------------------------------------------------------------ */

/**
 * Top-level so typing in a caption doesn't lose focus when the panel
 * re-renders around it.
 */
function PhotoTile({
  photo,
  uploader,
  canEdit,
  busy,
  editing,
  draft,
  confirming,
  onOpen,
  onStartEdit,
  onDraft,
  onSaveEdit,
  onCancelEdit,
  onAskDelete,
  onDelete,
}: {
  photo: PlanPhoto;
  uploader: PlanMember | undefined;
  canEdit: boolean;
  busy: boolean;
  editing: boolean;
  draft: string;
  confirming: boolean;
  onOpen: () => void;
  onStartEdit: () => void;
  onDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAskDelete: (next: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-2 break-inside-avoid rounded-xl overflow-hidden bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={photo.caption ?? "Open photo"}
          className="block w-full"
          style={{ aspectRatio: ratioOf(photo) }}
        >
          <img
            src={photo.url}
            alt={photo.caption ?? ""}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </button>

        {canEdit && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={onStartEdit}
              disabled={busy}
              title="Edit caption"
              aria-label="Edit caption"
              className="p-1.5 rounded-lg bg-black/45 text-white hover:bg-black/65 transition-colors disabled:opacity-40"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => onAskDelete(!confirming)}
              disabled={busy}
              title="Delete photo"
              aria-label="Delete photo"
              className="p-1.5 rounded-lg bg-black/45 text-white hover:bg-rose-500 transition-colors disabled:opacity-40"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {/* Deleting is irreversible, so it takes a second tap. */}
        {confirming && (
          <div className="absolute inset-0 bg-black/70 grid place-items-center p-3 text-center">
            <div>
              <p className="text-xs text-white mb-2">Delete this photo?</p>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => onAskDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-semibold"
                >
                  Keep
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-2 py-1.5">
        {editing ? (
          <div className="space-y-1.5">
            <input
              value={draft}
              autoFocus
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              placeholder="Add a caption…"
              aria-label="Caption"
              className={`${INPUT} !py-1.5 !text-xs`}
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[11px] font-semibold disabled:opacity-50"
              >
                <Check size={11} />
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-2 py-1 rounded-lg text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={canEdit ? onStartEdit : onOpen}
            className="w-full text-left"
          >
            <span
              className={`block text-[11px] leading-snug break-words ${
                photo.caption
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-faint)] italic"
              }`}
            >
              {photo.caption ?? (canEdit ? "Add a caption…" : "")}
            </span>
          </button>
        )}
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--color-text-faint)]">
          <span className="truncate">{uploader?.name ?? "Someone"}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/** `Album` tab — the trip's shared photo roll, browsable by anyone. */
export default function AlbumPanel({ plan, me, onPlan, totalDays }: PanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [uploadDay, setUploadDay] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const memberById = useMemo(
    () => new Map(plan.members.map((m) => [m.id, m])),
    [plan.members],
  );

  const groups = useMemo(() => groupByDay(plan.photos), [plan.photos]);
  const dayTagged = plan.photos.some((p) => p.dayNumber != null);
  /** Render order, flattened — the lightbox walks this list. */
  const ordered = useMemo(
    () => (dayTagged ? groups.flatMap(([, list]) => list) : plan.photos),
    [dayTagged, groups, plan.photos],
  );

  const openIndex =
    lightbox !== null && lightbox >= 0 && lightbox < ordered.length ? lightbox : null;
  const openPhoto = openIndex === null ? null : ordered[openIndex];
  /* Kept as a plain boolean so the effects below don't re-run on every step
     through the album — only on open and close. */
  const isOpen = openPhoto !== null;

  /* Lightbox effects ------------------------------------------------ */

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const count = ordered.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightbox(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLightbox((i) => (i === null ? i : (i - 1 + count) % count));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLightbox((i) => (i === null ? i : (i + 1) % count));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, ordered.length]);

  /* Actions --------------------------------------------------------- */

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

  /**
   * Upload one at a time so a slow connection doesn't stall on a whole batch,
   * and so the counter means something. Bad files are filtered up front.
   */
  async function uploadFiles(files: File[]) {
    if (busy || files.length === 0) return;

    const skipped: string[] = [];
    const queue = files.filter((file) => {
      if (!ALLOWED.has(file.type)) {
        skipped.push(`${file.name} isn't a JPEG, PNG, WebP or GIF`);
        return false;
      }
      if (file.size > MAX_BYTES) {
        skipped.push(`${file.name} is over 12 MB`);
        return false;
      }
      return true;
    });

    if (queue.length === 0) {
      setError(skipped.join(". ") + ".");
      return;
    }

    setBusy(true);
    setError(null);
    const day = uploadDay === "" ? undefined : Number(uploadDay);

    try {
      for (let i = 0; i < queue.length; i++) {
        const file = queue[i];
        setProgress({ done: i + 1, total: queue.length });
        const size = await readDimensions(file);
        const updated = await plansApi.addPhoto(plan.id, file, {
          day,
          width: size?.width,
          height: size?.height,
        });
        onPlan(updated);
      }
      if (skipped.length > 0) setError(`Skipped: ${skipped.join(", ")}.`);
    } catch (err) {
      // The server writes a human sentence for 415 / 413 — prefer it.
      const message = err instanceof Error ? err.message.trim() : "";
      setError(message || "Couldn't upload that photo. Try again?");
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  function saveCaption(photo: PlanPhoto) {
    const caption = draft.trim();
    setEditingId(null);
    if (caption === (photo.caption ?? "")) return;
    void run(() => plansApi.updatePhoto(plan.id, photo.id, caption));
  }

  function removePhoto(id: number) {
    setConfirmId(null);
    if (lightbox !== null) setLightbox(null);
    void run(() => plansApi.removePhoto(plan.id, id));
  }

  /* ---------------------------------------------------------------- */

  const uploader =
    openPhoto && openPhoto.memberId != null
      ? memberById.get(openPhoto.memberId)
      : undefined;

  function renderGrid(photos: PlanPhoto[]) {
    return (
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {photos.map((photo) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            uploader={
              photo.memberId != null ? memberById.get(photo.memberId) : undefined
            }
            canEdit={me !== null}
            busy={busy}
            editing={editingId === photo.id}
            draft={draft}
            confirming={confirmId === photo.id}
            onOpen={() => setLightbox(ordered.indexOf(photo))}
            onStartEdit={() => {
              setConfirmId(null);
              setEditingId(photo.id);
              setDraft(photo.caption ?? "");
            }}
            onDraft={setDraft}
            onSaveEdit={() => saveCaption(photo)}
            onCancelEdit={() => setEditingId(null)}
            onAskDelete={(next) => {
              setEditingId(null);
              setConfirmId(next ? photo.id : null);
            }}
            onDelete={() => removePhoto(photo.id)}
          />
        ))}
      </div>
    );
  }

  const uploadControl = me && (
    <div className="flex flex-wrap items-center gap-2">
      {totalDays > 0 && (
        <select
          value={uploadDay}
          onChange={(e) => setUploadDay(e.target.value)}
          aria-label="Tag these photos with a day"
          className={SMALL_SELECT}
        >
          <option value="">No day</option>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>
              Day {n}
            </option>
          ))}
        </select>
      )}
      <label
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors ${
          busy ? "opacity-50 cursor-default" : "cursor-pointer"
        }`}
      >
        {busy && progress ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Upload size={15} />
        )}
        {progress ? `Uploading ${progress.done} of ${progress.total}…` : "Add photos"}
        <input
          type="file"
          accept={ACCEPT}
          multiple
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            void uploadFiles(files);
          }}
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header ------------------------------------------------------ */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Images size={16} className="text-[var(--color-primary)]" />
          <h2 className="font-semibold">Album</h2>
          <span className="text-xs text-[var(--color-text-muted)] ml-auto">
            {plan.photos.length}{" "}
            {plan.photos.length === 1 ? "photo" : "photos"}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          JPEG, PNG, WebP or GIF, up to 12 MB each. Everyone on the trip can add
          to the roll.
        </p>

        {plan.photos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-divider)]">
            {me ? (
              uploadControl
            ) : (
              <p className="text-xs text-[var(--color-text-faint)]">
                Only people on this trip can add photos.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-500 px-1 break-words" role="alert">
          {error}
        </p>
      )}

      {/* Empty state ------------------------------------------------- */}
      {plan.photos.length === 0 ? (
        <div className={CARD}>
          <div className="text-center py-6">
            <Camera
              size={22}
              className="mx-auto mb-3 text-[var(--color-text-faint)]"
            />
            <h3 className="font-semibold mb-1">No photos yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-5 max-w-sm mx-auto">
              {me
                ? "Drop in the first few and the rest of the group will pile on."
                : "Nobody's added a photo to this trip yet."}
            </p>
            {me ? (
              <div className="flex justify-center">{uploadControl}</div>
            ) : (
              <p className="text-xs text-[var(--color-text-faint)]">
                Only people on this trip can add photos.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className={`${CARD} space-y-5`}>
          {dayTagged ? (
            groups.map(([day, photos]) => (
              <section key={day ?? "none"}>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {day === null ? "No day" : `Day ${day}`}
                  </h3>
                  <span className="text-[11px] text-[var(--color-text-faint)] ml-auto tabular-nums">
                    {photos.length}
                  </span>
                </div>
                {renderGrid(photos)}
              </section>
            ))
          ) : (
            renderGrid(plan.photos)
          )}
        </div>
      )}

      {/* Lightbox ---------------------------------------------------- */}
      {openPhoto && openIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0">
            <span className="text-xs text-white/60 tabular-nums">
              {openIndex + 1} / {ordered.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stop propagation so only backdrop clicks dismiss. */}
          <div
            className="flex-1 min-h-0 flex items-center gap-1 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                setLightbox((i) =>
                  i === null ? i : (i - 1 + ordered.length) % ordered.length,
                )
              }
              disabled={ordered.length < 2}
              aria-label="Previous photo"
              className="shrink-0 p-2 rounded-full text-white/80 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>

            <img
              src={openPhoto.url}
              alt={openPhoto.caption ?? ""}
              className="flex-1 min-w-0 max-h-full object-contain rounded-lg"
            />

            <button
              type="button"
              onClick={() =>
                setLightbox((i) => (i === null ? i : (i + 1) % ordered.length))
              }
              disabled={ordered.length < 2}
              aria-label="Next photo"
              className="shrink-0 p-2 rounded-full text-white/80 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div
            className="shrink-0 px-4 py-4 flex items-start gap-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar member={uploader} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-white/60">
                <span className="font-medium text-white/90">
                  {uploader?.name ?? "Someone"}
                </span>
                {openPhoto.dayNumber != null && (
                  <span>· Day {openPhoto.dayNumber}</span>
                )}
              </div>
              {openPhoto.caption && (
                <p className="text-sm text-white/90 mt-1 break-words">
                  {openPhoto.caption}
                </p>
              )}
            </div>
            {me && (
              <button
                type="button"
                onClick={() => removePhoto(openPhoto.id)}
                disabled={busy}
                aria-label="Delete photo"
                className="shrink-0 p-2 rounded-lg text-white/70 hover:text-rose-400 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
