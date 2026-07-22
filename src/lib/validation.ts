import {
  FIELD_LIMITS,
  PHOTO_LIMITS,
  isWithinBviBounds,
} from "@/lib/constants";

export interface ValidatedReport {
  latitude: number;
  longitude: number;
  severity: number;
  health_impact: number;
  comments: string | null;
}

export type ValidationResult =
  | { ok: true; data: ValidatedReport }
  | { ok: false; error: string };

function isInt(n: number) {
  return Number.isInteger(n);
}

/**
 * Validate the non-photo fields of a report submission (SPEC 5).
 * Photos are validated separately (they arrive as files).
 */
export function validateReportFields(raw: {
  latitude: unknown;
  longitude: unknown;
  severity: unknown;
  health_impact: unknown;
  comments: unknown;
}): ValidationResult {
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  const severity = Number(raw.severity);
  const health_impact = Number(raw.health_impact);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, error: "A valid location is required." };
  }
  if (!isWithinBviBounds(latitude, longitude)) {
    return { ok: false, error: "Location is outside the BVI area." };
  }

  if (
    !isInt(severity) ||
    severity < FIELD_LIMITS.severityMin ||
    severity > FIELD_LIMITS.severityMax
  ) {
    return { ok: false, error: "Severity must be a whole number from 1 to 10." };
  }
  if (
    !isInt(health_impact) ||
    health_impact < FIELD_LIMITS.healthMin ||
    health_impact > FIELD_LIMITS.healthMax
  ) {
    return { ok: false, error: "Health impact must be a whole number from 1 to 10." };
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
    data: { latitude, longitude, severity, health_impact, comments },
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
