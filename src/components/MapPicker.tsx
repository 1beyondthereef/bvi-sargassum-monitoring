"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Plus, Minus } from "lucide-react";
import { MAP_INITIAL, MAPBOX_STYLE } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

export interface MapPickerRef {
  locateUser: () => void;
}

const MARKER_COLOR = "#1b6d8d"; // ocean-600

/**
 * Mapbox pin picker — adapted from Report The Reef's MapPicker.
 * Tap to drop a pin, drag to adjust, or use device geolocation.
 */
export const MapPicker = forwardRef<MapPickerRef, MapPickerProps>(function MapPicker(
  { onLocationSelect, className },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onSelectRef = useRef(onLocationSelect);

  const [isLoaded, setIsLoaded] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

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
    map.on("click", (e) => placeMarker(e.lngLat.lng, e.lngLat.lat));

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

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

        {isLoaded && !selected && (
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
