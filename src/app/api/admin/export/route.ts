import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  IMPACT_CATEGORIES,
  REPORT_STATUSES,
  REPORT_TYPES,
  SHORE_AMOUNT_OPTIONS,
  severityRank,
} from "@/lib/constants";
import { areaHectares, impactCell } from "@/lib/report-labels";
import type { SargassumReport } from "@/lib/types";

export const runtime = "nodejs";

const COLUMNS = [
  "id",
  "created_at",
  "report_type",
  "latitude",
  "longitude",
  "severity",
  "health_impact",
  "shore_amount",
  "shore_height",
  "shore_coverage",
  "area_estimate",
  "area_hectares",
  "area_geojson",
  ...IMPACT_CATEGORIES.map((c) => `impact_${c.key}`),
  "comments",
  "photo_urls",
  "status",
];

/** Escape a value for CSV (RFC 4180): quote and double embedded quotes. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const reportType = searchParams.get("report_type");
  const shoreAmount = searchParams.get("shore_amount");
  const minSeverity = Number(searchParams.get("min_severity"));
  const includeHidden = searchParams.get("include_hidden") === "true";

  const supabase = createAdminClient();
  let query = supabase
    .from("sargassum_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (status && (REPORT_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  } else if (!includeHidden) {
    // Match the dashboard default: hidden reports excluded unless requested.
    query = query.neq("status", "hidden");
  }
  if (reportType && REPORT_TYPES.some((t) => t.value === reportType)) {
    query = query.eq("report_type", reportType);
  }
  if (shoreAmount && SHORE_AMOUNT_OPTIONS.some((a) => a.value === shoreAmount)) {
    query = query.eq("shore_amount", shoreAmount);
  }

  const { data, error } = await query;
  if (error) {
    console.error("CSV export query failed:", error);
    return NextResponse.json({ error: "Could not export reports." }, { status: 500 });
  }

  let rows = (data ?? []) as SargassumReport[];

  // Severity is filtered here rather than in SQL: land-based rows carry no
  // slider value and rank by shoreline amount instead, which the dashboard
  // does too. Filtering in SQL would silently drop every land report.
  if (Number.isFinite(minSeverity) && minSeverity > 0) {
    rows = rows.filter((r) => {
      const rank = severityRank(r);
      return rank !== null && rank >= minSeverity;
    });
  }

  const lines: string[] = [COLUMNS.join(",")];
  for (const r of rows) {
    const hectares = areaHectares(r.area_geojson);
    lines.push(
      [
        csvCell(r.id),
        csvCell(new Date(r.created_at).toISOString()),
        csvCell(r.report_type ?? ""),
        csvCell(String(r.latitude)),
        csvCell(String(r.longitude)),
        csvCell(r.severity === null ? "" : String(r.severity)),
        csvCell(r.health_impact === null ? "" : String(r.health_impact)),
        csvCell(r.shore_amount ?? ""),
        csvCell(r.shore_height ?? ""),
        csvCell(r.shore_coverage ?? ""),
        csvCell(r.area_estimate ?? ""),
        csvCell(hectares === null ? "" : hectares.toFixed(4)),
        csvCell(r.area_geojson ? JSON.stringify(r.area_geojson) : ""),
        ...IMPACT_CATEGORIES.map((c) => csvCell(impactCell(r.impacts, c.key))),
        csvCell(r.comments ?? ""),
        csvCell((r.photo_urls ?? []).join(";")),
        csvCell(r.status),
      ].join(",")
    );
  }
  const csv = lines.join("\r\n");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sargassum-reports-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
