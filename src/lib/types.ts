import type { ReportStatus } from "@/lib/constants";

/** A row in the `sargassum_reports` table. */
export interface SargassumReport {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  severity: number;
  health_impact: number;
  comments: string | null;
  photo_urls: string[];
  user_agent: string | null;
  status: ReportStatus;
}
