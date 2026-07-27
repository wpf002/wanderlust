import { useMemo, useState } from "react";
import {
  CornerDownRight,
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
  canDelete,
  busy,
  onDelete,
}: {
  comment: PlanComment;
  member: PlanMember | undefined;
  isMine: boolean;
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  const name = member?.name ?? comment.authorName ?? "Someone";
  // No member id means it came from a stranger browsing Discover.
  const fromVisitor = comment.memberId === null;

  return (
    <div className="flex gap-3 min-w-0">
      <Avatar member={member} fallbackName={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium break-words">{name}</span>
          {fromVisitor && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] whitespace-nowrap">
              Asked from Discover
            </span>
          )}
          {isMine && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] whitespace-nowrap">
              you
            </span>
          )}
          <span className="text-[11px] text-[var(--color-text-faint)] whitespace-nowrap">
            {timeAgo(comment.createdAt)}
          </span>

          {/* Only the trip's own people can clear the thread. */}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={busy}
              title="Delete comment"
              aria-label={`Delete ${name}'s comment`}
              className="ml-auto p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-red-500 hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          )}
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
  const canVisitorPost = isVisitor && plan.isPublished;
  const canPost = me !== null || canVisitorPost;

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
  const rowProps = (comment: PlanComment) => ({
    comment,
    member:
      comment.memberId === null
        ? undefined
        : memberById.get(comment.memberId) ?? undefined,
    isMine: me !== null && me.id === comment.memberId,
    canDelete: me !== null,
    busy,
    onDelete: () =>
      void run(() => plansApi.removeComment(plan.id, comment.id)),
  });

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
          Only people on this trip can post here.
        </p>
      )}
    </div>
  );
}
