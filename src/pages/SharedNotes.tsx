import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LoaderCircle,
  CircleAlert,
  MessageCircle,
  User,
  Clock,
  Send,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import Navbar from "@/components/Navbar";

interface TripComment {
  id: number;
  slug: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

interface SharedTrip {
  templateId: string;
  templateName: string;
  error?: string;
}

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

/** Comment thread for a shared trip, keyed by view slug (bundle `mae`). */
function TripComments({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [authorName, setAuthorName] = useState("");
  const [commentText, setCommentText] = useState("");

  const { data: comments = [], isLoading } = useQuery<TripComment[]>({
    queryKey: ["/api/comments", slug],
    queryFn: () =>
      apiRequest("GET", `/api/comments/${slug}`).then((r) => r.json()),
  });

  const addComment = useMutation({
    mutationFn: (body: { authorName: string; commentText: string }) =>
      apiRequest("POST", `/api/comments/${slug}`, body).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", slug] });
      setCommentText("");
    },
  });

  return (
    <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <MessageCircle size={16} className="text-[var(--color-primary)]" />
        Trip Comments
        {comments.length > 0 && (
          <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">
            ({comments.length})
          </span>
        )}
      </h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] py-4">
          <LoaderCircle size={14} className="animate-spin" /> Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-3">
          No comments yet. Be the first to leave one!
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              data-testid={`comment-${comment.id}`}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                <User size={13} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
                    <Clock size={9} />
                    {formatTimestamp(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {comment.commentText}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-[var(--color-divider)] pt-4 space-y-3">
        <input
          data-testid="input-comment-author"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        <textarea
          data-testid="input-comment-text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Leave a comment about this trip…"
          rows={3}
          maxLength={500}
          className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-faint)]">
            {commentText.length}/500
          </span>
          <button
            data-testid="btn-submit-comment"
            onClick={() => {
              if (authorName.trim() && commentText.trim()) {
                addComment.mutate({
                  authorName: authorName.trim(),
                  commentText: commentText.trim(),
                });
              }
            }}
            disabled={
              !authorName.trim() || !commentText.trim() || addComment.isPending
            }
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            <Send size={13} />
            {addComment.isPending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** `/shared/:slug` — read-only shared trip that redirects into the planner (bundle `gae`). */
export default function SharedNotesPage({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<SharedTrip | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiRequest("GET", `/api/trips/${slug}`)
      .then((r) => r.json())
      .then((data: SharedTrip) => {
        if (data.error) throw new Error(data.error);
        setTrip(data);
        setLoading(false);
      })
      .catch(() => {
        setError("This shared trip link is invalid or has expired.");
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (trip) {
      const timer = setTimeout(() => navigate(`/trip/${trip.templateId}`), 2000);
      return () => clearTimeout(timer);
    }
  }, [trip, navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-24">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-center">
            <LoaderCircle
              size={32}
              className="animate-spin text-[var(--color-primary)]"
            />
            <p className="text-[var(--color-text-muted)]">Loading shared trip…</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <CircleAlert size={32} className="text-red-500" />
            <p className="text-[var(--color-text-muted)]">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm"
            >
              Back to Explore
            </button>
          </div>
        )}
        {trip && !error && (
          <div>
            <div className="text-center mb-8">
              <p className="text-lg font-semibold">{trip.templateName}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Shared trip — redirecting to planner…
              </p>
              <LoaderCircle
                size={20}
                className="animate-spin text-[var(--color-primary)] mx-auto mt-4"
              />
            </div>
            <TripComments slug={slug} />
          </div>
        )}
      </div>
    </div>
  );
}
