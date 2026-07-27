import { useMemo, useState } from "react";
import {
  CornerDownRight,
  Eye,
  EyeOff,
  Flag,
  MessagesSquare,
  Send,
  Trash2,
} from "lucide-react";
import { plansApi, type PlanComment, type PlanMember } from "@/lib/plans";
import type { PanelProps } from "../GroupPlan";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5";
const INPUT =
  "w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";
const SEND_BUTTON =
  "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-50";
const PILL =
  "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md whitespace-nowrap";

/**
 * The API reports refusals as a plain sentence ("posting too fast", "too many
 * links"), which is far more use than our generic line — show it when there is
 * one, and fall back only for network-level failures.
 */
function errorText(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status && e.message) return e.message;
  return "Couldn't save that. Try again?";
}

/** "just now" / "4h ago" / "3d ago" — mirrors the journal's clock. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

/**
 * Colored initial for a member, neutral grey for a visitor — the colour is the
 * fastest way to tell the group's own chatter from an outsider's question.
 */
function Avatar({
  member,
  fallbackName,
}: {
  member: PlanMember | undefined;
  fallbackName: string;
}) {
  const label = member?.name ?? fallbackName ?? "?";
  return (
    <span
      className="w-7 h-7 rounded-full shrink-0 grid place-items-center text-[11px] font-bold text-white"
      style={{ backgroundColor: member?.color ?? "var(--color-text-faint)" }}
      aria-hidden
    >
      {label.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * One comment — same shape for roots and replies, just narrower inside.
 * Top-level so re-rendering the panel doesn't remount the open reply box.
 */
function CommentRow({
  comment,
  member,
  isMine,
  canModerate,
  canReport,
  reported,
  busy,
  onDelete,
  onToggleHidden,
  onReport,
}: {
  comment: PlanComment;
  member: PlanMember | undefined;
  isMine: boolean;
  canModerate: boolean;
  canReport: boolean;
  reported: boolean;
  busy: boolean;
  onDelete: () => void;
  onToggleHidden: () => void;
  onReport: () => void;
}) {
  const name = member?.name ?? comment.authorName ?? "Someone";
  // No member id means it came from a stranger browsing Discover.
  const fromVisitor = comment.memberId === null;
  // The server only sends moderation state to members, so nobody else can end
  // up rendering it by accident.
  const hidden = canModerate && comment.hidden === true;
  const reports = canModerate ? comment.reportCount ?? 0 : 0;

  return (
    <div className={`flex gap-3 min-w-0 ${hidden ? "opacity-50" : ""}`}>
      <Avatar member={member} fallbackName={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium break-words">{name}</span>
          {fromVisitor && (
            <span
              className={`${PILL} bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]`}
            >
              Asked from Discover
            </span>
          )}
          {isMine && (
            <span
              className={`${PILL} bg-[var(--color-primary)]/15 text-[var(--color-primary)]`}
            >
              you
            </span>
          )}
          {hidden && (
            <span
              className={`${PILL} bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]`}
            >
              Hidden
            </span>
          )}
          {reports > 0 && (
            <span
              className={`${PILL} bg-amber-500/15 text-amber-600 dark:text-amber-400`}
            >
              {reports} {reports === 1 ? "report" : "reports"}
            </span>
          )}
          <span className="text-[11px] text-[var(--color-text-faint)] whitespace-nowrap">
            {timeAgo(comment.createdAt)}
          </span>

          {/* Actions ride in their own box so they wrap as a unit on a phone. */}
          <div className="ml-auto flex items-center gap-0.5">
            {/* Anyone reading the thread can flag someone else's comment. */}
            {canReport && (
              <button
                onClick={onReport}
                disabled={busy || reported}
                title={reported ? "Reported" : "Report to the group"}
                aria-label={
                  reported ? "Reported" : `Report ${name}'s comment`
                }
                className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors disabled:hover:bg-transparent disabled:opacity-60"
              >
                <Flag size={12} />
                {reported ? "Reported" : "Report"}
              </button>
            )}

            {/* Hiding is the soft, undoable version of a delete. */}
            {canModerate && (
              <button
                onClick={onToggleHidden}
                disabled={busy}
                title={hidden ? "Restore comment" : "Hide comment"}
                aria-label={
                  hidden
                    ? `Restore ${name}'s comment`
                    : `Hide ${name}'s comment`
                }
                className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
              >
                {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            )}

            {/* Only the trip's own people can clear the thread. */}
            {canModerate && (
              <button
                onClick={onDelete}
                disabled={busy}
                title="Delete comment"
                aria-label={`Delete ${name}'s comment`}
                className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-red-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
          {comment.body}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/** `Talk` tab — the trip's thread, plus questions from people eyeing a copy. */
export default function TalkPanel({ plan, me, onPlan }: PanelProps) {
  const [draft, setDraft] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reports don't come back on the plan, so the "Reported" acknowledgement only
  // has to last as long as this visit.
  const [reported, setReported] = useState<Set<number>>(new Set());

  const memberById = useMemo(
    () => new Map(plan.members.map((m) => [m.id, m])),
    [plan.members],
  );

  /** Top-level comments in post order, each carrying its own replies. */
  const threads = useMemo(() => {
    const sorted = [...plan.comments].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id - b.id,
    );
    const replies = new Map<number, PlanComment[]>();
    for (const c of sorted) {
      if (c.parentId === null) continue;
      const bucket = replies.get(c.parentId);
      if (bucket) bucket.push(c);
      else replies.set(c.parentId, [c]);
    }
    return sorted
      .filter((c) => c.parentId === null)
      .map((root) => ({ root, replies: replies.get(root.id) ?? [] }));
  }, [plan.comments]);

  // A stranger may only speak up once the trip is out on Discover; on a private
  // trip the thread is read-only for them.
  const isVisitor = me === null;
  // The group can also close questions on a trip that's still on Discover.
  const canVisitorPost = isVisitor && plan.isPublished && plan.allowQuestions;
  const canPost = me !== null || canVisitorPost;

  /** Run a plansApi call and hand the fresh plan back to the shell. */
  async function run(work: () => Promise<typeof plan>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onPlan(await work());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  /** Flagging returns no plan, so the acknowledgement is kept here instead. */
  async function report(id: number) {
    if (busy || reported.has(id)) return;
    setBusy(true);
    setError(null);
    try {
      await plansApi.reportComment(plan.id, id);
      setReported((prev) => new Set(prev).add(id));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const composerReady =
    draft.trim().length > 0 && (me !== null || visitorName.trim().length > 0);

  function post() {
    const body = draft.trim();
    if (!body || !composerReady) return;
    const name = visitorName.trim();
    setDraft("");
    void run(() =>
      plansApi.addComment(plan.id, {
        body,
        // Visitors are identified by the name they type; members by their token.
        ...(me ? {} : { authorName: name }),
      }),
    );
  }

  function postReply(parentId: number) {
    const body = replyDraft.trim();
    if (!body) return;
    setReplyDraft("");
    setReplyTo(null);
    void run(() => plansApi.addComment(plan.id, { body, parentId }));
  }

  function closeReply() {
    setReplyTo(null);
    setReplyDraft("");
  }

  /** Shared wiring for every row, so roots and replies stay identical. */
  const rowProps = (comment: PlanComment) => {
    const isMine = me !== null && me.id === comment.memberId;
    return {
      comment,
      member:
        comment.memberId === null
          ? undefined
          : memberById.get(comment.memberId) ?? undefined,
      isMine,
      canModerate: me !== null,
      // Flagging your own words helps nobody.
      canReport: !isMine,
      reported: reported.has(comment.id),
      busy,
      onDelete: () =>
        void run(() => plansApi.removeComment(plan.id, comment.id)),
      onToggleHidden: () =>
        void run(() =>
          plansApi.setCommentHidden(plan.id, comment.id, !comment.hidden),
        ),
      onReport: () => void report(comment.id),
    };
  };

  return (
    <div className="space-y-4">
      {/* Thread ------------------------------------------------------ */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
          <MessagesSquare size={16} className="text-[var(--color-primary)]" />
          <h2 className="font-semibold">Talk it through</h2>
          <span className="text-xs text-[var(--color-text-muted)] ml-auto">
            {plan.comments.length}{" "}
            {plan.comments.length === 1 ? "message" : "messages"}
          </span>
        </div>

        {/* Only worth showing once strangers can actually see the trip. */}
        {me && plan.isPublished && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
            <button
              onClick={() =>
                void run(() =>
                  plansApi.update(plan.id, {
                    allowQuestions: !plan.allowQuestions,
                  }),
                )
              }
              disabled={busy}
              role="switch"
              aria-checked={plan.allowQuestions}
              className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              <span
                className={`w-8 h-[18px] shrink-0 rounded-full p-0.5 flex transition-colors ${
                  plan.allowQuestions
                    ? "bg-[var(--color-primary)] justify-end"
                    : "bg-[var(--color-border)] justify-start"
                }`}
                aria-hidden
              >
                <span className="w-[14px] h-[14px] rounded-full bg-white" />
              </span>
              Questions from visitors
              <span className="font-medium">
                {plan.allowQuestions ? "on" : "off"}
              </span>
            </button>
            {!plan.allowQuestions && (
              <p className="w-full text-[11px] text-[var(--color-text-faint)]">
                Visitors can read this trip but can't ask questions.
              </p>
            )}
          </div>
        )}

        {threads.length === 0 ? (
          <div className="text-center py-6">
            <MessagesSquare
              size={22}
              className="mx-auto mb-3 text-[var(--color-text-faint)]"
            />
            <h3 className="font-semibold mb-1">Nothing said yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto">
              Ask the daft questions here — which airport, how much cash, who's
              driving from the ferry.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {threads.map(({ root, replies }) => (
              <li key={root.id} className="min-w-0">
                <CommentRow {...rowProps(root)} />

                {replies.length > 0 && (
                  <ul className="mt-3 ml-4 sm:ml-10 space-y-3 border-l border-[var(--color-divider)] pl-3 sm:pl-4">
                    {replies.map((reply) => (
                      <li key={reply.id} className="min-w-0">
                        <CommentRow {...rowProps(reply)} />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Replies stay one level deep, so only roots get the affordance. */}
                {me &&
                  (replyTo === root.id ? (
                    <div className="mt-3 ml-4 sm:ml-10 space-y-2">
                      <textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") closeReply();
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            postReply(root.id);
                          }
                        }}
                        rows={2}
                        autoFocus
                        placeholder="Reply…"
                        aria-label="Reply"
                        className={`${INPUT} resize-y`}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => postReply(root.id)}
                          disabled={!replyDraft.trim() || busy}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold transition-colors disabled:opacity-50"
                        >
                          <Send size={12} />
                          Reply
                        </button>
                        <button
                          onClick={closeReply}
                          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReplyTo(root.id);
                        setReplyDraft("");
                      }}
                      className="mt-2 ml-4 sm:ml-10 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      <CornerDownRight size={12} />
                      Reply
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-500 px-1" role="alert">
          {error}
        </p>
      )}

      {/* Composer ---------------------------------------------------- */}
      {canPost ? (
        <div className={CARD}>
          <h2 className="font-semibold mb-1">
            {me ? "Say something" : "Ask the group a question"}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {me
              ? "Everyone on the trip sees this, and so does anyone browsing it on Discover."
              : "You're not on this trip — your question is public and the group can answer."}
          </p>

          <div className="space-y-3">
            {/* Visitors have no member record, so the name is the attribution. */}
            {!me && (
              <input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                maxLength={40}
                placeholder="Your name"
                aria-label="Your name"
                className={INPUT}
              />
            )}

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
              }}
              rows={3}
              placeholder={
                me
                  ? "Anyone mind a 6am start on day two?"
                  : "How far is the trailhead from town?"
              }
              aria-label="Message"
              className={`${INPUT} resize-y`}
            />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                onClick={post}
                disabled={!composerReady || busy}
                className={`${SEND_BUTTON} w-full sm:w-auto`}
              >
                <Send size={15} />
                {me ? "Post" : "Ask"}
              </button>
              <span className="text-[11px] text-[var(--color-text-faint)]">
                ⌘/Ctrl + Enter to send
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-faint)] px-1">
          {isVisitor && plan.isPublished
            ? "Visitors can read this trip but can't ask questions."
            : "Only people on this trip can post here."}
        </p>
      )}
    </div>
  );
}
