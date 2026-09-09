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
export const AREA_ESTIMATE_OPTIONS = [
  { value: "small", label: "Small", hint: "Under 0.5 hectares" },
  { value: "medium", label: "Medium", hint: "0.5–2 hectares" },
  { value: "large", label: "Large", hint: "2–10 hectares" },
  { value: "very_large", label: "Very large", hint: "Over 10 hectares" },
] as const;

/**
 * Impact categories and their options (SPEC-V2 C6). Every category is optional,
 * multi-select, and carries a free-text "other". This ordering drives the form,
 * the admin detail view, and the CSV columns alike.
 *
 * `none` is mutually exclusive with the other options in its category, which is
 * what lets the admin side tell "reported no impact" apart from "didn't answer".
 */
export const IMPACT_CATEGORIES = [
  {
    key: "health",
    label: "Health",
    shortLabel: "Health",
    // SPEC-V2 C6/H: the Environmental Health Division of the Ministry of Health
    // and Social Development has not signed off on this list, so the form says so.
    draft: true,
    options: [
      { value: "none", label: "None" },
      { value: "eye_irritation", label: "Eye irritation" },
      { value: "respiratory_irritation", label: "Respiratory irritation" },
      { value: "headache", label: "Headache" },
      { value: "nausea", label: "Nausea" },
      { value: "skin_irritation", label: "Skin irritation" },
    ],
  },
  {
    key: "household",
    label: "Household / property",
    shortLabel: "Household",
    options: [
      { value: "none", label: "None" },
      { value: "odour_in_home", label: "Odour in the home" },
      { value: "corrosion", label: "Corrosion (metals, electronics)" },
      { value: "property_damage", label: "Property damage" },
    ],
  },
  {
    key: "environmental",
    label: "Environmental",
    shortLabel: "Environment",
    options: [
      { value: "none", label: "None" },
      { value: "discoloured_water", label: "Discoloured water" },
      { value: "dead_marine_life", label: "Dead fish or marine life" },
      { value: "water_quality", label: "Water quality concerns" },
    ],
  },
  {
    key: "fishing",
    label: "Fishing & boating",
    shortLabel: "Fishing",
    options: [
      { value: "none", label: "None" },
      { value: "fouled_gear", label: "Fouled gear" },
      { value: "blocked_ramp", label: "Blocked ramp or mooring" },
      { value: "engine_intake", label: "Engine intake issues" },
      { value: "navigation_hazard", label: "Navigation hazard" },
    ],
  },
  {
    key: "economic",
    label: "Economic",
    shortLabel: "Economic",
    options: [
      { value: "none", label: "None" },
      { value: "lost_bookings", label: "Lost bookings or customers" },
      { value: "cleanup_costs", label: "Cleanup costs" },
      { value: "lost_fishing_income", label: "Lost fishing income" },
    ],
  },
] as const;
export type ImpactCategoryKey = (typeof IMPACT_CATEGORIES)[number]["key"];

/** Shown wherever the draft health list appears (SPEC-V2 C6). */
export const HEALTH_DRAFT_NOTE = "Draft — pending Environmental Health Division review";

export const IMPACT_LIMITS = {
  otherMaxChars: 300,
} as const;

// Bounds on a submitted extent so a crafted request can't store an unbounded
// blob in `area_geojson`.
export const AREA_LIMITS = {
  maxBytes: 100_000,
  maxPolygons: 20,
  maxVertices: 2000,
} as const;

/** Shoreline amount mapped onto the 1–10 scale, for admin display only. */
const SHORE_AMOUNT_RANK: Record<string, number> = { light: 3, moderate: 6, heavy: 9 };

/**
 * Comparable severity for admin sorting, filtering, and map colour (SPEC-V2 F).
 * Land-based rows carry no slider value, so fall back to the shoreline amount.
 * Display only — this is never written to the database.
 */
export function severityRank(report: {
  severity: number | null;
  shore_amount?: string | null;
}): number | null {
  if (report.severity !== null) return report.severity;
  if (report.shore_amount) return SHORE_AMOUNT_RANK[report.shore_amount] ?? null;
  return null;
}

// Severity color buckets for the admin map (SPEC 6.2)
export function severityBucket(severity: number): "low" | "mid" | "high" {
  if (severity <= 3) return "low";
  if (severity <= 6) return "mid";
  return "high";
}
