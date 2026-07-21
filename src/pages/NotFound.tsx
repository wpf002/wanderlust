import { AlertCircle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-md mx-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          This page doesn't exist. Head back to Explore.
        </p>
      </div>
    </div>
  );
}
