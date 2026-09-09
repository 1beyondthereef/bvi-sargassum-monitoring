import type { FeatureCollection } from "geojson";
import type { ReportStatus, ReportType } from "@/lib/constants";

/** A row in the `sargassum_reports` table. */
export interface SargassumReport {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  /** Null on v1 rows, and on land-based rows that use the shoreline categories. */
  severity: number | null;
  health_impact: number | null;
  comments: string | null;
  photo_urls: string[];
  user_agent: string | null;
  status: ReportStatus;

  // SPEC-V2 E — null on v1 rows.
  report_type: ReportType | null;
  area_geojson: FeatureCollection | null;
  area_estimate: string | null;
  shore_amount: string | null;
  shore_height: string | null;
  shore_coverage: string | null;
  impacts: Record<string, unknown> | null;
}
