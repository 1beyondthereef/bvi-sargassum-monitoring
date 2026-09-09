"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection } from "geojson";
import { MAPBOX_STYLE } from "@/lib/constants";
import { publicEnv } from "@/lib/env";

const SOURCE = "detail-area";

interface ReportAreaMapProps {
  geojson: FeatureCollection;
  latitude: number;
  longitude: number;
}

/** Read-only mini-map of one report's drawn extent, fitted to the shape (SPEC-V2 F). */
export function ReportAreaMap({ geojson, latitude, longitude }: ReportAreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const token = publicEnv.mapboxToken;
    if (!token) return;
    mapboxgl.accessToken = token;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [longitude, latitude],
        zoom: 12,
        interactive: false,
        attributionControl: false,
      });
    } catch (err) {
      console.error("Detail map failed to initialize:", err);
      return;
    }

    map.on("load", () => {
      map.addSource(SOURCE, { type: "geojson", data: geojson });
      map.addLayer({
        id: `${SOURCE}-fill`,
        type: "fill",
        source: SOURCE,
        paint: { "fill-color": "#e29b1b", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: `${SOURCE}-line`,
        type: "line",
        source: SOURCE,
        paint: { "line-color": "#a65714", "line-width": 2 },
      });

      new mapboxgl.Marker({ color: "#1b6d8d" }).setLngLat([longitude, latitude]).addTo(map);

      // Frame the whole extent plus the pin.
      const bounds = new mapboxgl.LngLatBounds([longitude, latitude], [longitude, latitude]);
      for (const feature of geojson.features) {
        if (feature.geometry?.type !== "Polygon") continue;
        for (const ring of feature.geometry.coordinates) {
          for (const [lng, lat] of ring) bounds.extend([lng, lat]);
        }
      }
      map.fitBounds(bounds, { padding: 30, animate: false, maxZoom: 15 });
    });

    return () => map.remove();
  }, [geojson, latitude, longitude]);

  return <div ref={containerRef} className="h-48 w-full rounded-lg border border-ocean-200" />;
}
