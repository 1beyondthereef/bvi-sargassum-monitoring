import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  REPORT_STATUSES,
  REPORT_TYPES,
  SHORE_AMOUNT_OPTIONS,
  severityRank,
} from "@/lib/constants";
import type { SargassumReport } from "@/lib/types";

export const runtime = "nodejs";

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

  const supabase = createAdminClient();
  let query = supabase
    .from("sargassum_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (status && (REPORT_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }
  if (reportType && REPORT_TYPES.some((t) => t.value === reportType)) {
    query = query.eq("report_type", reportType);
  }
  if (shoreAmount && SHORE_AMOUNT_OPTIONS.some((a) => a.value === shoreAmount)) {
    query = query.eq("shore_amount", shoreAmount);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Admin reports fetch failed:", error);
    return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }

  let reports = (data ?? []) as SargassumReport[];

  // Ranked in JS, not SQL: land-based rows have no slider value and rank by
  // shoreline amount, so a `severity >= n` filter would drop them all.
  if (Number.isFinite(minSeverity) && minSeverity > 0) {
    reports = reports.filter((r) => {
      const rank = severityRank(r);
      return rank !== null && rank >= minSeverity;
    });
  }

  return NextResponse.json({ reports });
}
