/**
 * Thin fetch wrapper mirroring the original app's `apiRequest`.
 *
 * `token` is a group plan's per-member write secret; the server rejects writes
 * without one. See `src/lib/plans.ts`.
 */
export async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["x-plan-token"] = token;

  const res = await fetch(path, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    // The API reports problems as `{ "error": "..." }`. Surface that sentence
    // on its own so callers can show it to the user as-is.
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed?.error) message = parsed.error;
    } catch {
      /* not JSON — keep the raw body */
    }
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res;
}
