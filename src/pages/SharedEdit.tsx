import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LoaderCircle,
  CircleAlert,
  Users,
  Car,
  Plane,
  Calendar,
  DollarSign,
  FilePen,
  CircleCheckBig,
  Globe,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { trips } from "@/data/trips";
import { estimateTripCosts, formatCurrency } from "@/lib/costs";
import type { Settings } from "@/data/types";
import Navbar from "@/components/Navbar";

interface EditTrip {
  templateId: string;
  templateName: string;
  settings: Settings;
  notes: string;
  editSlug?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** `/edit/:editSlug` — a shared, collaboratively-editable trip (bundle `YOe`). */
export default function SharedEditPage({ editSlug }: { editSlug: string }) {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery<EditTrip>({
    queryKey: ["/api/edit", editSlug],
    queryFn: () =>
      apiRequest("GET", `/api/edit/${editSlug}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
  });

  useEffect(() => {
    if (trip?.notes !== undefined) setNotes(trip.notes);
  }, [trip?.notes]);

  const saveNotes = useMutation({
    mutationFn: (value: string) =>
      apiRequest("POST", `/api/edit/${editSlug}/notes`, { notes: value }).then(
        (r) => r.json(),
      ),
    onMutate: () => setStatus("saving"),
    onSuccess: () => {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    },
    onError: () => setStatus("error"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <LoaderCircle
            size={24}
            className="animate-spin text-[var(--color-primary)]"
          />
        </div>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <CircleAlert size={36} className="mx-auto text-red-500 mb-4" />
          <h2 className="font-semibold text-lg mb-2">Trip not found</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            This shared edit link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  const template = trips.find((t) => t.id === trip.templateId);
  const costs = template ? estimateTripCosts(template, trip.settings) : null;
  const isRoadTrip = template?.type === "road_trip";
  const accent = isRoadTrip
    ? "text-amber-600 dark:text-amber-400"
    : "text-blue-600 dark:text-blue-400";

  const stats: { icon: ReactNode; label: string; val: ReactNode }[] = [
    {
      icon: isRoadTrip ? <Car size={14} /> : <Globe size={14} />,
      label: isRoadTrip ? "Miles" : "Type",
      val: isRoadTrip
        ? (
            template?.roadTripDays?.reduce((sum, d) => sum + d.miles, 0) || 0
          ).toLocaleString()
        : "International",
    },
    { icon: <Calendar size={14} />, label: "Days", val: template?.totalDays || "—" },
    { icon: <Users size={14} />, label: "Travelers", val: trip.settings.travelers },
    {
      icon: <DollarSign size={14} />,
      label: "Est. Total",
      val: costs ? formatCurrency(costs.total) : "—",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 mb-3">
            <Users size={11} /> Shared Trip — Collaborative Mode
          </div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-3">
            <span className="text-3xl">{template?.emoji}</span>
            {trip.templateName}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {template?.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map(({ icon, label, val }) => (
            <div
              key={label}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 text-center"
            >
              <div
                className={`flex items-center justify-center gap-1 text-sm font-bold mb-0.5 ${accent}`}
              >
                {icon} {val}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-sm mb-1">Trip Settings</h3>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="capitalize">
              Budget: <strong>{trip.settings.budget}</strong>
            </span>
            {isRoadTrip && trip.settings.mpg && (
              <span>
                MPG: <strong>{trip.settings.mpg}</strong>
              </span>
            )}
            {isRoadTrip && trip.settings.gasPrice && (
              <span>
                Gas: <strong>${trip.settings.gasPrice.toFixed(2)}/gal</strong>
              </span>
            )}
            {!isRoadTrip && trip.settings.flightCost && (
              <span>
                Flight: <strong>${trip.settings.flightCost}/person</strong>
              </span>
            )}
          </div>
          {costs && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {isRoadTrip ? (
                <>
                  <div className="bg-[var(--color-surface-offset)] rounded-xl p-2.5 text-center">
                    <div className={`text-base font-bold ${accent}`}>
                      {formatCurrency(costs.fuel || 0)}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Fuel
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface-offset)] rounded-xl p-2.5 text-center">
                    <div className={`text-base font-bold ${accent}`}>
                      {formatCurrency(costs.lodging)}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Lodging
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[var(--color-surface-offset)] rounded-xl p-2.5 text-center">
                    <div className={`text-base font-bold ${accent}`}>
                      {formatCurrency(costs.flights || 0)}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Flights
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface-offset)] rounded-xl p-2.5 text-center">
                    <div className={`text-base font-bold ${accent}`}>
                      {formatCurrency(costs.lodging)}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Hotels
                    </div>
                  </div>
                </>
              )}
              <div className="col-span-2 sm:col-span-1 bg-[var(--color-surface-offset)] rounded-xl p-2.5 text-center">
                <div className="text-base font-bold">
                  {formatCurrency(costs.total)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Total
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FilePen size={14} className="text-[var(--color-primary)]" />
              Shared Notes
            </h3>
            <div className="flex items-center gap-2">
              {status === "saving" && (
                <span className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
                  <LoaderCircle size={11} className="animate-spin" /> Saving…
                </span>
              )}
              {status === "saved" && (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  <CircleCheckBig size={11} /> Saved
                </span>
              )}
              {status === "error" && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <CircleAlert size={11} /> Error
                </span>
              )}
              <button
                data-testid="edit-save-notes"
                onClick={() => saveNotes.mutate(notes)}
                disabled={saveNotes.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Anyone with this link can read and update these shared notes. Use for
            packing ideas, dates, meeting points, etc.
          </p>
          <textarea
            data-testid="edit-notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            placeholder="Add travel notes, ideas, or reminders for your group…"
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none leading-relaxed"
          />
          <p className="mt-2 text-xs text-[var(--color-text-faint)]">
            <Globe size={10} className="inline mr-0.5" />
            Share this link with your group:{" "}
            <strong>{window.location.href}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
