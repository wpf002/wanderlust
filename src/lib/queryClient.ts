import { QueryClient, type QueryFunction } from "@tanstack/react-query";

/** Default query fn: joins the query key into a URL, e.g. ["/api/checklist", key] → /api/checklist/key */
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = queryKey.join("/");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: 1,
    },
  },
});
