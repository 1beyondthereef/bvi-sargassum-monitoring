/**
 * Shared constants for the BVI Sargassum Monitoring app.
 * Values sourced from SPEC.md (Sections 4.2, 5, 7) and SPEC-V2.md.
 */

// Governing body (SPEC-V2 A). Single source of truth for user-facing naming.
export const MINISTRY_NAME =
  "Ministry of Environment, Natural Resources and Climate Change";

// SPEC-V2 A — exact wording pending Ministry confirmation.
export const MINISTRY_ATTRIBUTION = `An initiative of the ${MINISTRY_NAME}, Government of the Virgin Islands.`;

// Alt text for the official crest/wordmark lockup at public/ministry-logo.png
export const MINISTRY_LOGO_ALT = `Government of the Virgin Islands — ${MINISTRY_NAME}`;

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

// Stranding type (SPEC-V2 C1) — determines which sections of the form appear.
export const REPORT_TYPES = [
  {
    value: "in_water",
    label: "In-water stranding",
    hint: "Floating in a bay or in nearshore water",
  },
  {
    value: "land",
    label: "Land-based (shoreline) stranding",
    hint: "Washed up on the beach or shoreline",
  },
  {
    value: "mixed",
    label: "Mixed",
    hint: "Both in the water and on the shoreline",
  },
] as const;
export type ReportType = (typeof REPORT_TYPES)[number]["value"];

// Land-based categorical assessment (SPEC-V2 C3)
export const SHORE_AMOUNT_OPTIONS = [
  { value: "light", label: "Light", hint: "Scattered patches, beach fully usable" },
  { value: "moderate", label: "Moderate", hint: "Continuous windrows, parts of beach affected" },
  { value: "heavy", label: "Heavy", hint: "Thick accumulation, beach largely unusable" },
] as const;

export const SHORE_HEIGHT_OPTIONS = [
  { value: "ankle", label: "Ankle-deep", hint: "Less than 10 cm" },
  { value: "knee", label: "Knee-deep", hint: "10–50 cm" },
  { value: "waist", label: "Waist-deep or more", hint: "More than 50 cm" },
] as const;

export const SHORE_COVERAGE_OPTIONS = [
  { value: "lt_25", label: "Less than 25%", hint: "of the visible shoreline" },
  { value: "25_50", label: "25–50%", hint: "of the visible shoreline" },
  { value: "50_75", label: "50–75%", hint: "of the visible shoreline" },
  { value: "gt_75", label: "More than 75%", hint: "of the visible shoreline" },
] as const;

// In-water extent fallback for users who can't or won't draw (SPEC-V2 C2).
// Polygon drawing arrives in build step 4.
export const AREA_ESTIMATE_OPTIONS = [
  { value: "small", label: "Small", hint: "Under 0.5 hectares" },
  { value: "medium", label: "Medium", hint: "0.5–2 hectares" },
  { value: "large", label: "Large", hint: "2–10 hectares" },
  { value: "very_large", label: "Very large", hint: "Over 10 hectares" },
] as const;

/**
 * Interim bridge until the SPEC-V2 E migration (build step 7).
 *
 * Land-based reports replace the 1–10 slider with categories, but the API and
 * `sargassum_reports` still require a severity, and the admin map colors by it.
 * Map the amount category onto the legacy scale so submissions keep working;
 * remove this once `shore_amount` is a real column.
 */
export const SHORE_AMOUNT_SEVERITY: Record<string, number> = {
  light: 3,
  moderate: 6,
  heavy: 9,
};

// Severity color buckets for the admin map (SPEC 6.2)
export function severityBucket(severity: number): "low" | "mid" | "high" {
  if (severity <= 3) return "low";
  if (severity <= 6) return "mid";
  return "high";
}
