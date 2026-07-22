import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { REPORT_STATUSES, type ReportStatus } from "@/lib/constants";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const status = body.status;
  if (
    typeof status !== "string" ||
    !(REPORT_STATUSES as readonly string[]).includes(status)
  ) {
    return NextResponse.json(
      { error: `status must be one of: ${REPORT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sargassum_reports")
    .update({ status: status as ReportStatus })
    .eq("id", params.id)
    .select("id, status")
    .single();

  if (error || !data) {
    console.error("Status update failed:", error);
    return NextResponse.json({ error: "Could not update report." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, status: data.status });
}
