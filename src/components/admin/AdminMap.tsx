"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAP_INITIAL, MAPBOX_STYLE, severityBucket } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import type { SargassumReport } from "@/lib/types";

const SEVERITY_COLORS: Record<"low" | "mid" | "high", string> = {
  low: "#16a34a",
  mid: "#f59e0b",
  high: "#dc2626",
};

interface AdminMapProps {
  reports: SargassumReport[];
  onSelect: (report: SargassumReport) => void;
  focus: { lng: number; lat: number; nonce: number } | null;
}

export function AdminMap({ reports, onSelect, focus }: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = publicEnv.mapboxToken;
    if (!token) return;
    mapboxgl.accessToken = token;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: MAP_INITIAL.center,
        zoom: MAP_INITIAL.zoom,
      });
    } catch (err) {
      console.error("Admin map failed to initialize:", err);
      return;
    }
    mapRef.current = map;
    map.dragRotate.disable();
    map.on("load", () => {
      loadedRef.current = true;
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuild markers when reports change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const report of reports) {
      const color = SEVERITY_COLORS[severityBucket(report.severity)];
      const popupNode = buildPopup(report, () => onSelectRef.current(report));
      const popup = new mapboxgl.Popup({ offset: 24, maxWidth: "260px" }).setDOMContent(
        popupNode
      );
      const marker = new mapboxgl.Marker({ color })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [reports]);

  // Fly to a focused report
  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo({ center: [focus.lng, focus.lat], zoom: 14 });
  }, [focus]);

  return <div ref={containerRef} className="h-[420px] w-full" />;
}

function buildPopup(report: SargassumReport, onDetails: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "text-sm text-slate-800";

  const date = document.createElement("div");
  date.className = "font-semibold";
  date.textContent = new Date(report.created_at).toLocaleString();
  wrap.appendChild(date);

  const stats = document.createElement("div");
  stats.className = "mt-1";
  stats.textContent = `Severity ${report.severity} · Health ${report.health_impact}`;
  wrap.appendChild(stats);

  if (report.comments) {
    const c = document.createElement("div");
    c.className = "mt-1 text-slate-600";
    c.textContent =
      report.comments.length > 90 ? report.comments.slice(0, 90) + "…" : report.comments;
    wrap.appendChild(c);
  }

  if (report.photo_urls.length > 0) {
    const row = document.createElement("div");
    row.className = "mt-2 flex gap-1";
    report.photo_urls.slice(0, 3).forEach((url) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.className = "h-12 w-12 rounded object-cover";
      row.appendChild(img);
    });
    wrap.appendChild(row);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "View details";
  btn.className =
    "mt-2 w-full rounded bg-ocean-600 px-2 py-1 text-xs font-semibold text-white";
  btn.addEventListener("click", onDetails);
  wrap.appendChild(btn);

  return wrap;
}
