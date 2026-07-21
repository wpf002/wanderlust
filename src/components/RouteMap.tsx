import { useEffect, useRef } from "react";

export interface RouteStop {
  day: number;
  name: string;
  lat: number;
  lng: number;
  type?: "start" | "end" | "stop";
}

interface RouteMapProps {
  stops: RouteStop[];
  accentColor: string;
}

/** Leaflet route map: dashed polyline through the stops with numbered day markers. */
export default function RouteMap({ stops, accentColor }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || stops.length === 0) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap contributors © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      const latLngs = stops.map((s) => [s.lat, s.lng] as [number, number]);
      L.polyline(latLngs, {
        color: accentColor,
        weight: 3,
        opacity: 0.8,
        dashArray: "8,6",
      }).addTo(map);

      stops.forEach((stop, i) => {
        const isStart = stop.type === "start";
        const isEnd = stop.type === "end";
        const bg = isStart ? "#22c55e" : isEnd ? "#ef4444" : accentColor;
        const label = isStart ? "▶" : isEnd ? "★" : String(i);
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${bg};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;font-family:sans-serif;
            border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
          ">${label}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });
        L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>Day ${stop.day}</strong><br/>${stop.name}`, {
            closeButton: false,
          });
      });

      map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stops, accentColor]);

  return <div ref={containerRef} className="w-full h-full min-h-[300px]" />;
}
