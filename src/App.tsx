import { useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import { apiRequest } from "./lib/api";
import {
  DEFAULT_SETTINGS,
  GAS_PRICE_FALLBACK,
  type GasPriceData,
  type Settings,
} from "./data/types";
import ExplorePage from "./pages/Explore";
import PlanPage from "./pages/Plan";
import CreateTripPage from "./pages/CreateTrip";
import GroupPlanPage from "./pages/GroupPlan";
import DiscoverPage from "./pages/Discover";
import TripDetailPage from "./pages/TripDetail";
import PackingPage from "./pages/Packing";
import ComparePage from "./pages/Compare";
import SharedNotesPage from "./pages/SharedNotes";
import SpendingPage from "./pages/Spending";
import JournalPage from "./pages/Journal";
import ChecklistPage from "./pages/Checklist";
import TimelinePage from "./pages/Timeline";
import SharedEditPage from "./pages/SharedEdit";
import NotFoundPage from "./pages/NotFound";
import CommandPalette from "./components/CommandPalette";

async function fetchGasPrices(): Promise<GasPriceData> {
  try {
    const res = await fetch("/api/gas-prices");
    if (!res.ok) throw new Error("no data");
    return await res.json();
  } catch {
    return {
      date: "",
      route66Avg: GAS_PRICE_FALLBACK,
      northernParksAvg: GAS_PRICE_FALLBACK,
      isLive: false,
    };
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [lastForm, setLastForm] = useState<unknown>(null);
  const [gasPriceData, setGasPriceData] = useState<GasPriceData | null>(null);

  useEffect(() => {
    fetchGasPrices().then((data) => {
      setGasPriceData(data);
      if (data.isLive) {
        setSettings((s) => ({ ...s, gasPrice: data.route66Avg }));
      }
    });
  }, []);

  // Sync theme with the saved preference: the server value wins, then this
  // browser's stored choice, otherwise dark (the app's default).
  useEffect(() => {
    apiRequest("GET", "/api/settings/theme")
      .then((r) => r.json())
      .then((r: { value?: string }) => {
        const stored = localStorage.getItem("wanderlust-theme");
        const dark = (r.value || stored || "dark") === "dark";
        document.documentElement.classList.toggle("dark", dark);
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Switch>
        <Route path="/">
          <ExplorePage
            settings={settings}
            setSettings={setSettings}
            gasPriceData={gasPriceData}
          />
        </Route>
        <Route path="/plan">
          <PlanPage
            settings={settings}
            setSettings={setSettings}
            lastForm={lastForm}
            setLastForm={setLastForm}
          />
        </Route>
        <Route path="/trip/:id">
          {(params) => (
            <TripDetailPage
              templateId={params.id || "route66"}
              settings={settings}
              setSettings={setSettings}
              gasPriceData={gasPriceData}
            />
          )}
        </Route>
        <Route path="/create">
          <CreateTripPage />
        </Route>
        <Route path="/create/:id">
          {(params) => <CreateTripPage editId={params.id} />}
        </Route>
        <Route path="/g/:code">
          {(params) => <GroupPlanPage code={params.code || ""} />}
        </Route>
        <Route path="/discover">
          <DiscoverPage />
        </Route>
        <Route path="/packing">
          <PackingPage />
        </Route>
        <Route path="/compare">
          <ComparePage />
        </Route>
        <Route path="/shared/:slug">
          {(params) => <SharedNotesPage slug={params.slug || ""} />}
        </Route>
        <Route path="/dashboard">
          <SpendingPage />
        </Route>
        <Route path="/notes">
          <JournalPage />
        </Route>
        <Route path="/checklist">
          <ChecklistPage />
        </Route>
        <Route path="/timeline">
          <TimelinePage />
        </Route>
        <Route path="/edit/:editSlug">
          {(params) => <SharedEditPage editSlug={params.editSlug || ""} />}
        </Route>
        <Route component={NotFoundPage} />
      </Switch>
      <CommandPalette />
    </>
  );
}
