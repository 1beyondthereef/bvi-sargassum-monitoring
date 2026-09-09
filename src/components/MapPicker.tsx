"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import area from "@turf/area";
import type { FeatureCollection } from "geojson";
import { MapPin, Pencil, Plus, Minus, Trash2 } from "lucide-react";
import { MAP_INITIAL, MAPBOX_STYLE } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import { cn, formatArea } from "@/lib/utils";

export interface DrawnArea {
  geojson: FeatureCollection;
  squareMeters: number;
}

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
  /** Enables polygon drawing for in-water extents (SPEC-V2 C2). */
  enableAreaDraw?: boolean;
  onAreaChange?: (area: DrawnArea | null) => void;
}

export interface MapPickerRef {
  locateUser: () => void;
}

/** Mapbox fires draw.* events that aren't in the base map event typings. */
type CustomEventTarget = {
  on(type: string, listener: (e: { mode?: string }) => void): void;
  off(type: string, listener: (e: { mode?: string }) => void): void;
};

const MARKER_COLOR = "#1b6d8d"; // ocean-600
const DRAW_FILL = "#e29b1b"; // sargassum-500 — reads clearly over blue water
const DRAW_LINE = "#a65714"; // sargassum-700

/** Draw styling on the app palette; the library defaults are too faint on water. */
const DRAW_STYLES = [
  {
    id: "gl-draw-polygon-fill",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    paint: { "fill-color": DRAW_FILL, "fill-outline-color": DRAW_FILL, "fill-opacity": 0.35 },
  },
  {
    id: "gl-draw-polygon-stroke",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": DRAW_LINE, "line-width": 2.5 },
  },
  {
    id: "gl-draw-line",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": DRAW_LINE, "line-width": 2.5, "line-dasharray": [0.2, 2] },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-halo-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 7, "circle-color": "#ffffff" },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 5, "circle-color": DRAW_LINE },
  },
  {
    id: "gl-draw-polygon-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 4, "circle-color": DRAW_FILL },
  },
];

/**
 * Mapbox pin picker — adapted from Report The Reef's MapPicker.
 * Tap to drop a pin, drag to adjust, or use device geolocation.
 */
export const MapPicker = forwardRef<MapPickerRef, MapPickerProps>(function MapPicker(
  { onLocationSelect, className, enableAreaDraw = false, onAreaChange },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onSelectRef = useRef(onLocationSelect);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onAreaChangeRef = useRef(onAreaChange);

  const [isLoaded, setIsLoaded] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [areaSqM, setAreaSqM] = useState<number | null>(null);
  const [shapeCount, setShapeCount] = useState(0);

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    onAreaChangeRef.current = onAreaChange;
  }, [onAreaChange]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = publicEnv.mapboxToken;
    if (!token) {
      console.error("Mapbox token not configured");
      return;
    }
    mapboxgl.accessToken = token;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE,
        center: MAP_INITIAL.center,
        zoom: MAP_INITIAL.zoom,
      });
    } catch (err) {
      // e.g. WebGL unavailable on the device/browser
      console.error("Map failed to initialize:", err);
      setMapError(true);
      return;
    }
    mapRef.current = map;
    map.on("error", (e) => console.error("Mapbox error:", e?.error ?? e));

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    function placeMarker(lng: number, lat: number) {
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        const marker = new mapboxgl.Marker({ color: MARKER_COLOR, draggable: true })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
        marker.on("dragend", () => {
          const p = marker.getLngLat();
          setSelected({ lat: p.lat, lng: p.lng });
          onSelectRef.current(p.lat, p.lng);
        });
        markerRef.current = marker;
      }
      setSelected({ lat, lng });
      onSelectRef.current(lat, lng);
    }

    // expose for geolocation handler
    (map as unknown as { __place: typeof placeMarker }).__place = placeMarker;

    map.on("load", () => setIsLoaded(true));
    map.on("click", (e) => {
      // While drawing (or when tapping an existing shape) the click belongs to
      // the draw tool, not the pin.
      const draw = drawRef.current;
      if (draw) {
        if (draw.getMode() !== "simple_select") return;
        if (draw.getFeatureIdsAt(e.point).length > 0) return;
      }
      placeMarker(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Attach/detach the polygon draw tool when the report type calls for it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !enableAreaDraw) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: DRAW_STYLES,
    });
    map.addControl(draw as unknown as mapboxgl.IControl);
    drawRef.current = draw;

    const sync = () => {
      const collection = draw.getAll() as FeatureCollection;
      const count = collection.features.length;
      setShapeCount(count);
      if (count === 0) {
        setAreaSqM(null);
        onAreaChangeRef.current?.(null);
        return;
      }
      const squareMeters = area(collection);
      setAreaSqM(squareMeters);
      onAreaChangeRef.current?.({ geojson: collection, squareMeters });
    };

    const onModeChange = (e: { mode?: string }) => setDrawing(e.mode === "draw_polygon");

    const events = map as unknown as CustomEventTarget;
    events.on("draw.create", sync);
    events.on("draw.update", sync);
    events.on("draw.delete", sync);
    events.on("draw.modechange", onModeChange);

    return () => {
      events.off("draw.create", sync);
      events.off("draw.update", sync);
      events.off("draw.delete", sync);
      events.off("draw.modechange", onModeChange);
      if (map.hasControl(draw as unknown as mapboxgl.IControl)) {
        map.removeControl(draw as unknown as mapboxgl.IControl);
      }
      drawRef.current = null;
      setDrawing(false);
      setAreaSqM(null);
      setShapeCount(0);
      onAreaChangeRef.current?.(null);
    };
  }, [enableAreaDraw, isLoaded]);

  const startDrawing = () => {
    drawRef.current?.changeMode("draw_polygon");
    setDrawing(true);
  };

  const clearArea = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.deleteAll();
    draw.changeMode("simple_select");
    setDrawing(false);
    setAreaSqM(null);
    setShapeCount(0);
    onAreaChangeRef.current?.(null);
  };

  const handleLocateMe = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Location isn't available on this device. Tap the map to place your pin.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo({ center: [longitude, latitude], zoom: MAP_INITIAL.locateZoom });
          (map as unknown as { __place: (lng: number, lat: number) => void }).__place(
            longitude,
            latitude
          );
        } else {
          // Map unavailable (e.g. no WebGL) — still record the location.
          setSelected({ lat: latitude, lng: longitude });
          onSelectRef.current(latitude, longitude);
        }
      },
      () => {
        setLocating(false);
        setGeoError(
          "We couldn't access your location. Tap the map to place your pin instead."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  useImperativeHandle(ref, () => ({ locateUser: handleLocateMe }), []);

  return (
    <div className="space-y-2">
      <div className={cn("relative overflow-hidden rounded-xl border border-ocean-200", className)}>
        <div ref={mapContainer} className="h-full w-full min-h-[300px]" />

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ocean-50 p-4 text-center">
            <p className="text-sm text-ocean-700">
              The map couldn&apos;t load on this device. Use the{" "}
              <span className="font-semibold">Use my location</span> button below
              to set your position.
            </p>
          </div>
        )}

        {!isLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ocean-50/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-ocean-500 border-t-transparent" />
              <p className="text-sm text-ocean-700">Loading map…</p>
            </div>
          </div>
        )}

        {isLoaded && drawing && (
          <div className="pointer-events-none absolute left-3 right-3 top-3 rounded-lg bg-white/95 px-3 py-2 shadow-md">
            <p className="text-sm font-medium text-ocean-800">
              Tap around the affected water, then tap the first point again to
              close the shape.
            </p>
          </div>
        )}

        {isLoaded && !drawing && !selected && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-white/95 px-3 py-2 shadow-md">
            <p className="flex items-center gap-2 text-sm font-medium text-ocean-800">
              <MapPin className="h-4 w-4 text-ocean-600" />
              Tap the map to drop a pin
            </p>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Zoom in"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-ocean-800 shadow-md active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Zoom out"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-ocean-800 shadow-md active:scale-95"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* "Use my location" — prominent */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-700 disabled:opacity-60"
      >
        <MapPin className="h-5 w-5" />
        {locating ? "Locating…" : "Use my location"}
      </button>

      {enableAreaDraw && !mapError && (
        <div className="space-y-2 rounded-lg border border-ocean-200 bg-ocean-50/60 p-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startDrawing}
              disabled={drawing}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ocean-300 bg-white px-3 py-2.5 text-sm font-semibold text-ocean-800 shadow-sm transition-colors hover:bg-ocean-50 disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              {drawing ? "Drawing…" : shapeCount > 0 ? "Draw another" : "Draw area"}
            </button>
            {shapeCount > 0 && (
              <button
                type="button"
                onClick={clearArea}
                className="flex items-center justify-center gap-2 rounded-lg border border-ocean-300 bg-white px-3 py-2.5 text-sm font-semibold text-ocean-800 shadow-sm transition-colors hover:bg-ocean-50"
              >
                <Trash2 className="h-4 w-4" />
                Redraw
              </button>
            )}
          </div>

          <p className="text-sm text-ocean-700">
            {areaSqM !== null ? (
              <>
                Approximate area:{" "}
                <span className="font-semibold">{formatArea(areaSqM)}</span>
                {shapeCount > 1 && (
                  <span className="text-ocean-600"> across {shapeCount} patches</span>
                )}
              </>
            ) : (
              "Optional — draw the affected water area, or just drop a pin above."
            )}
          </p>
        </div>
      )}

      {geoError && <p className="text-sm text-sargassum-700">{geoError}</p>}

      <p className="text-sm text-ocean-700">
        {selected ? (
          <>
            Selected:{" "}
            <span className="font-mono font-medium">
              {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </span>
          </>
        ) : (
          "No location selected yet."
        )}
      </p>
    </div>
  );
});
