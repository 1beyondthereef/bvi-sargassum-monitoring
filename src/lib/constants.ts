/**
 * Shared constants for the BVI Sargassum Monitoring app.
 * Values sourced from SPEC.md (Sections 4.2, 5, 7).
 */

// Map initial view for the public form (SPEC 4.2)
export const MAP_INITIAL = {
  center: [-64.62, 18.43] as [number, number], // [lng, lat] — BVI
  zoom: 10,
  locateZoom: 15,
} as const;

// Default Mapbox style
export const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";

// Server-side validation bounding box (SPEC 5) — BVI with margin.
// Reject obviously bogus pins outside this range.
export const BVI_BOUNDS = {
  minLat: 17.5,
  maxLat: 19.0,
  minLng: -65.5,
  maxLng: -63.9,
} as const;

export function isWithinBviBounds(lat: number, lng: number): boolean {
  return (
    lat >= BVI_BOUNDS.minLat &&
    lat <= BVI_BOUNDS.maxLat &&
    lng >= BVI_BOUNDS.minLng &&
    lng <= BVI_BOUNDS.maxLng
  );
}

// Supabase Storage (SPEC 3)
export const STORAGE_BUCKET = "sargassum-photos";
// Uploaded object path: reports/{uuid}/{index}.jpg
export const storagePath = (reportId: string, index: number) =>
  `reports/${reportId}/${index}.jpg`;

// Photo constraints (SPEC 4.3, 5)
export const PHOTO_LIMITS = {
  maxCount: 3,
  maxBytesPreCompression: 8 * 1024 * 1024, // 8 MB
  compression: {
    maxLongEdge: 1600,
    quality: 0.8,
  },
} as const;

// Field constraints (SPEC 4)
export const FIELD_LIMITS = {
  severityMin: 1,
  severityMax: 10,
  healthMin: 1,
  healthMax: 10,
  commentsMaxChars: 1000,
} as const;

// Basic rate limiting (SPEC 5)
export const RATE_LIMIT = {
  maxSubmissionsPerHour: 10,
  windowMs: 60 * 60 * 1000,
} as const;

// Report status values (SPEC 3)
export const REPORT_STATUSES = ["new", "reviewed", "hidden"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Severity color buckets for the admin map (SPEC 6.2)
export function severityBucket(severity: number): "low" | "mid" | "high" {
  if (severity <= 3) return "low";
  if (severity <= 6) return "mid";
  return "high";
}
