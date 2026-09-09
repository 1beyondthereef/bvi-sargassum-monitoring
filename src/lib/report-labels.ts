import area from "@turf/area";
import type { FeatureCollection } from "geojson";
import {
  AREA_ESTIMATE_OPTIONS,
  IMPACT_CATEGORIES,
  REPORT_TYPES,
  SHORE_AMOUNT_OPTIONS,
  SHORE_COVERAGE_OPTIONS,
  SHORE_HEIGHT_OPTIONS,
} from "@/lib/constants";
import type { ImpactAnswer, ImpactAnswers, SargassumReport } from "@/lib/types";

/**
 * Turn stored codes into the wording the public form used, so the dashboard,
 * the map popups, and the CSV all read the same. Unknown codes fall through
 * unchanged rather than being hidden.
 */
function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined
): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export const reportTypeLabel = (v: string | null | undefined) => labelFor(REPORT_TYPES, v);

/** Table-width version of the type label; the full wording stays in the detail view. */
const SHORT_TYPE: Record<string, string> = {
  in_water: "In-water",
  land: "Land-based",
  mixed: "Mixed",
};
export const reportTypeShortLabel = (v: string | null | undefined) =>
  v ? SHORT_TYPE[v] ?? reportTypeLabel(v) : "";
export const shoreAmountLabel = (v: string | null | undefined) =>
  labelFor(SHORE_AMOUNT_OPTIONS, v);
export const shoreHeightLabel = (v: string | null | undefined) =>
  labelFor(SHORE_HEIGHT_OPTIONS, v);
export const shoreCoverageLabel = (v: string | null | undefined) =>
  labelFor(SHORE_COVERAGE_OPTIONS, v);
export const areaEstimateLabel = (v: string | null | undefined) =>
  labelFor(AREA_ESTIMATE_OPTIONS, v);

/** Total drawn extent in hectares, or null when nothing was drawn. */
export function areaHectares(geojson: FeatureCollection | null): number | null {
  if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
    return null;
  }
  try {
    return area(geojson) / 10_000;
  } catch {
    return null;
  }
}

/** "Heavy · Knee-deep · More than 75%" — empty when the report isn't land-based. */
export function shorelineSummary(report: SargassumReport): string {
  return [
    shoreAmountLabel(report.shore_amount),
    shoreHeightLabel(report.shore_height),
    shoreCoverageLabel(report.shore_coverage),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Drawn area if there is one, otherwise the size estimate the reporter picked. */
export function extentSummary(report: SargassumReport): string {
  const hectares = areaHectares(report.area_geojson);
  if (hectares !== null) {
    const shapes = report.area_geojson?.features.length ?? 0;
    const size = hectares < 100 ? `${hectares.toFixed(1)} ha` : `${(hectares / 100).toFixed(2)} km²`;
    return shapes > 1 ? `${size} (${shapes} areas)` : size;
  }
  return areaEstimateLabel(report.area_estimate);
}

const IMPACT_OPTION_LABELS = new Map(
  IMPACT_CATEGORIES.map((c) => [
    c.key as string,
    new Map(c.options.map((o) => [o.value as string, o.label as string])),
  ])
);

/**
 * Flatten one impact category to "Selection; Selection; free text" (SPEC-V2 F).
 * Stored option codes are resolved to their form wording so the CSV reads the
 * way the Ministry saw the question.
 */
export function impactCell(impacts: ImpactAnswers | null, key: string): string {
  const answer = impacts?.[key as keyof ImpactAnswers] as ImpactAnswer | undefined;
  if (!answer) return "";
  const labels = IMPACT_OPTION_LABELS.get(key);
  const parts = (answer.selections ?? []).map((s) => labels?.get(s) ?? s);
  if (answer.other && answer.other.trim() !== "") parts.push(answer.other.trim());
  return parts.join("; ");
}

/** True when the category holds an actual impact rather than an explicit "None". */
function isRealImpact(answer: ImpactAnswer | undefined): boolean {
  if (!answer) return false;
  if ((answer.other ?? "").trim() !== "") return true;
  return (answer.selections ?? []).some((s) => s !== "none");
}

/** Categories where the reporter recorded an impact, for the table and stats. */
export function impactedCategories(impacts: ImpactAnswers | null): string[] {
  if (!impacts) return [];
  return IMPACT_CATEGORIES.filter((c) => isRealImpact(impacts[c.key])).map((c) => c.shortLabel);
}

/** "Health, Fishing", "None reported", or "" when the section was skipped. */
export function impactsSummary(impacts: ImpactAnswers | null): string {
  if (!impacts || Object.keys(impacts).length === 0) return "";
  const hit = impactedCategories(impacts);
  return hit.length > 0 ? hit.join(", ") : "None reported";
}
