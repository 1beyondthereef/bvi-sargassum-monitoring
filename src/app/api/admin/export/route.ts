import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { REPORT_STATUSES } from "@/lib/constants";
import type { SargassumReport } from "@/lib/types";

export const runtime = "nodejs";

const COLUMNS = [
  "id",
  "created_at",
  "latitude",
  "longitude",
  "severity",
  "health_impact",
  "comments",
  "photo_urls",
  "status",
] as const;

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
  const minSeverity = searchParams.get("min_severity");
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
  if (minSeverity && Number.isFinite(Number(minSeverity))) {
    query = query.gte("severity", Number(minSeverity));
  }

  const { data, error } = await query;
  if (error) {
    console.error("CSV export query failed:", error);
    return NextResponse.json({ error: "Could not export reports." }, { status: 500 });
  }

  const rows = (data ?? []) as SargassumReport[];
  const lines: string[] = [COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.id),
        csvCell(new Date(r.created_at).toISOString()),
        csvCell(String(r.latitude)),
        csvCell(String(r.longitude)),
        csvCell(String(r.severity)),
        csvCell(String(r.health_impact)),
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
