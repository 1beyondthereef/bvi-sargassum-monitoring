import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { REPORT_STATUSES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const minSeverity = searchParams.get("min_severity");

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
  if (minSeverity && Number.isFinite(Number(minSeverity))) {
    query = query.gte("severity", Number(minSeverity));
  }

  const { data, error } = await query;
  if (error) {
    console.error("Admin reports fetch failed:", error);
    return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}
