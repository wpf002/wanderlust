/** Thin fetch wrapper mirroring the original app's `apiRequest`. */
export async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}
