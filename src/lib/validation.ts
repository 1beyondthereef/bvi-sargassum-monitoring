import type { FeatureCollection } from "geojson";
import {
  AREA_ESTIMATE_OPTIONS,
  AREA_LIMITS,
  FIELD_LIMITS,
  IMPACT_CATEGORIES,
  IMPACT_LIMITS,
  PHOTO_LIMITS,
  REPORT_TYPES,
  SHORE_AMOUNT_OPTIONS,
  SHORE_COVERAGE_OPTIONS,
  SHORE_HEIGHT_OPTIONS,
  isWithinBviBounds,
  type ImpactCategoryKey,
  type ReportType,
} from "@/lib/constants";
import type { ImpactAnswers } from "@/lib/types";

export interface ValidatedReport {
  latitude: number;
  longitude: number;
  report_type: ReportType;
  severity: number | null;
  health_impact: number | null;
  comments: string | null;
  area_geojson: FeatureCollection | null;
  area_estimate: string | null;
  shore_amount: string | null;
  shore_height: string | null;
  shore_coverage: string | null;
  impacts: ImpactAnswers | null;
}

export type ValidationResult =
  | { ok: true; data: ValidatedReport }
  | { ok: false; error: string };

function isInt(n: number) {
  return Number.isInteger(n);
}

function allowedValues(options: readonly { value: string }[]): Set<string> {
  return new Set(options.map((o) => o.value));
}

const REPORT_TYPE_VALUES = allowedValues(REPORT_TYPES);
const SHORE_AMOUNT_VALUES = allowedValues(SHORE_AMOUNT_OPTIONS);
const SHORE_HEIGHT_VALUES = allowedValues(SHORE_HEIGHT_OPTIONS);
const SHORE_COVERAGE_VALUES = allowedValues(SHORE_COVERAGE_OPTIONS);
const AREA_ESTIMATE_VALUES = allowedValues(AREA_ESTIMATE_OPTIONS);

function readChoice(
  raw: unknown,
  allowed: Set<string>
): { ok: true; value: string | null } | { ok: false } {
  if (raw == null || String(raw).trim() === "") return { ok: true, value: null };
  const value = String(raw).trim();
  return allowed.has(value) ? { ok: true, value } : { ok: false };
}

/**
 * Parse and sanity-check a drawn extent (SPEC-V2 C2). Only polygons are
 * accepted, every vertex must sit in the BVI window, and the payload is capped
 * so a crafted request can't push an unbounded blob into the table.
 */
function parseAreaGeojson(
  raw: unknown
): { ok: true; value: FeatureCollection | null } | { ok: false; error: string } {
  if (raw == null || String(raw).trim() === "") return { ok: true, value: null };

  const text = String(raw);
  if (text.length > AREA_LIMITS.maxBytes) {
    return { ok: false, error: "The drawn area is too complex. Please redraw it more simply." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "The drawn area could not be read. Please redraw it." };
  }

  const fc = parsed as FeatureCollection;
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return { ok: false, error: "The drawn area is not in the expected format." };
  }
  if (fc.features.length === 0) return { ok: true, value: null };
  if (fc.features.length > AREA_LIMITS.maxPolygons) {
    return { ok: false, error: `At most ${AREA_LIMITS.maxPolygons} areas can be drawn.` };
  }

  let vertexCount = 0;
  for (const feature of fc.features) {
    const geometry = feature?.geometry;
    if (!geometry || geometry.type !== "Polygon") {
      return { ok: false, error: "Only drawn areas (polygons) can be submitted." };
    }
    if (!Array.isArray(geometry.coordinates)) {
      return { ok: false, error: "The drawn area is not in the expected format." };
    }
    for (const ring of geometry.coordinates) {
      if (!Array.isArray(ring)) {
        return { ok: false, error: "The drawn area is not in the expected format." };
      }
      for (const position of ring) {
        if (!Array.isArray(position) || position.length < 2) {
          return { ok: false, error: "The drawn area is not in the expected format." };
        }
        const [lng, lat] = position;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return { ok: false, error: "The drawn area is not in the expected format." };
        }
        if (!isWithinBviBounds(Number(lat), Number(lng))) {
          return { ok: false, error: "The drawn area is outside the BVI." };
        }
        vertexCount++;
        if (vertexCount > AREA_LIMITS.maxVertices) {
          return {
            ok: false,
            error: "The drawn area is too detailed. Please redraw it more simply.",
          };
        }
      }
    }
  }

  return { ok: true, value: fc };
}

const IMPACT_OPTION_VALUES = new Map<string, Set<string>>(
  IMPACT_CATEGORIES.map((c) => [c.key, new Set(c.options.map((o) => o.value))])
);

/**
 * Parse the optional structured impact answers (SPEC-V2 C6). Unknown categories
 * and unknown option codes are rejected rather than quietly stored, so the
 * column only ever holds values the admin dashboard and CSV know how to label.
 */
function parseImpacts(
  raw: unknown
): { ok: true; value: ImpactAnswers | null } | { ok: false; error: string } {
  if (raw == null || String(raw).trim() === "") return { ok: true, value: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return { ok: false, error: "Your impact answers could not be read." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Your impact answers are not in the expected format." };
  }

  const result: ImpactAnswers = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const allowed = IMPACT_OPTION_VALUES.get(key);
    if (!allowed) return { ok: false, error: "That impact category isn't recognised." };
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { ok: false, error: "Your impact answers are not in the expected format." };
    }

    const { selections: rawSelections, other: rawOther } = value as {
      selections?: unknown;
      other?: unknown;
    };

    let selections: string[] = [];
    if (rawSelections != null) {
      if (!Array.isArray(rawSelections)) {
        return { ok: false, error: "Your impact answers are not in the expected format." };
      }
      for (const item of rawSelections) {
        if (typeof item !== "string" || !allowed.has(item)) {
          return { ok: false, error: "That impact answer isn't recognised." };
        }
      }
      // De-duplicate, and drop "none" if it arrived alongside real selections.
      selections = Array.from(new Set(rawSelections as string[]));
      if (selections.length > 1) selections = selections.filter((s) => s !== "none");
    }

    let other: string | undefined;
    if (rawOther != null && String(rawOther).trim() !== "") {
      const text = String(rawOther).trim();
      if (text.length > IMPACT_LIMITS.otherMaxChars) {
        return {
          ok: false,
          error: `Impact descriptions must be ${IMPACT_LIMITS.otherMaxChars} characters or fewer.`,
        };
      }
      other = text;
    }

    if (selections.length === 0 && other === undefined) continue;
    result[key as ImpactCategoryKey] = { ...(selections.length > 0 && { selections }), ...(other !== undefined && { other }) };
  }

  return { ok: true, value: Object.keys(result).length > 0 ? result : null };
}

/**
 * Validate the non-photo fields of a report submission (SPEC 5, SPEC-V2 C).
 * Which fields are required depends on the stranding type; answers that don't
 * apply to the chosen type are dropped rather than stored.
 */
export function validateReportFields(raw: {
  latitude: unknown;
  longitude: unknown;
  report_type: unknown;
  severity: unknown;
  comments: unknown;
  impacts: unknown;
  area_geojson: unknown;
  area_estimate: unknown;
  shore_amount: unknown;
  shore_height: unknown;
  shore_coverage: unknown;
}): ValidationResult {
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, error: "A valid location is required." };
  }
  if (!isWithinBviBounds(latitude, longitude)) {
    return { ok: false, error: "Location is outside the BVI area." };
  }

  const reportTypeRaw = raw.report_type == null ? "" : String(raw.report_type).trim();
  if (!REPORT_TYPE_VALUES.has(reportTypeRaw)) {
    return { ok: false, error: "Please choose what kind of stranding you're reporting." };
  }
  const report_type = reportTypeRaw as ReportType;
  const isWater = report_type === "in_water" || report_type === "mixed";
  const isLand = report_type === "land" || report_type === "mixed";

  // The 1–10 health slider is gone (SPEC-V2 C6): new rows leave the column null
  // and carry their answers in `impacts` instead. v1 rows keep their value.
  const impacts = parseImpacts(raw.impacts);
  if (!impacts.ok) return { ok: false, error: impacts.error };

  // In-water reports keep the 1–10 severity slider; land-based reports replace
  // it with the shoreline categories (SPEC-V2 C3).
  let severity: number | null = null;
  if (report_type === "in_water") {
    const value = Number(raw.severity);
    if (!isInt(value) || value < FIELD_LIMITS.severityMin || value > FIELD_LIMITS.severityMax) {
      return { ok: false, error: "Severity must be a whole number from 1 to 10." };
    }
    severity = value;
  }

  let shore_amount: string | null = null;
  let shore_height: string | null = null;
  let shore_coverage: string | null = null;
  if (isLand) {
    const amount = readChoice(raw.shore_amount, SHORE_AMOUNT_VALUES);
    const height = readChoice(raw.shore_height, SHORE_HEIGHT_VALUES);
    const coverage = readChoice(raw.shore_coverage, SHORE_COVERAGE_VALUES);
    if (!amount.ok || !height.ok || !coverage.ok) {
      return { ok: false, error: "Please answer the shoreline questions." };
    }
    if (!amount.value || !height.value || !coverage.value) {
      return { ok: false, error: "Amount, seaweed height, and shoreline coverage are required." };
    }
    shore_amount = amount.value;
    shore_height = height.value;
    shore_coverage = coverage.value;
  }

  let area_geojson: FeatureCollection | null = null;
  let area_estimate: string | null = null;
  if (isWater) {
    const parsed = parseAreaGeojson(raw.area_geojson);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    area_geojson = parsed.value;

    const estimate = readChoice(raw.area_estimate, AREA_ESTIMATE_VALUES);
    if (!estimate.ok) return { ok: false, error: "That extent estimate isn't recognised." };
    // The drawn polygon is the measurement; the dropdown is only its fallback.
    area_estimate = area_geojson ? null : estimate.value;
  }

  let comments: string | null = null;
  if (raw.comments != null && String(raw.comments).trim() !== "") {
    const text = String(raw.comments);
    if (text.length > FIELD_LIMITS.commentsMaxChars) {
      return {
        ok: false,
        error: `Comments must be ${FIELD_LIMITS.commentsMaxChars} characters or fewer.`,
      };
    }
    comments = text.trim();
  }

  return {
    ok: true,
    data: {
      latitude,
      longitude,
      report_type,
      severity,
      health_impact: null,
      comments,
      area_geojson,
      area_estimate,
      shore_amount,
      shore_height,
      shore_coverage,
      impacts: impacts.value,
    },
  };
}

/**
 * Validate uploaded photo files (SPEC 5): at most 3, each an image,
 * each ≤ 8 MB (pre-compression ceiling used as an upper bound).
 */
export function validatePhotos(files: File[]): { ok: true } | { ok: false; error: string } {
  if (files.length > PHOTO_LIMITS.maxCount) {
    return { ok: false, error: `At most ${PHOTO_LIMITS.maxCount} photos are allowed.` };
  }
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "Only image files can be uploaded." };
    }
    if (file.size > PHOTO_LIMITS.maxBytesPreCompression) {
      return {
        ok: false,
        error: `Each photo must be under ${
          PHOTO_LIMITS.maxBytesPreCompression / 1024 / 1024
        } MB.`,
      };
    }
  }
  return { ok: true };
}
