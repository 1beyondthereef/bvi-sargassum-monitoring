import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` on scheduled invocations
 * whenever CRON_SECRET is set on the project. Without the secret configured we
 * reject everything, so the route is never publicly runnable by accident.
 */
function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Keep-alive ping: Supabase pauses free-tier projects after ~7 consecutive days
 * with no activity. A daily HEAD count touches the database without
 * transferring any rows.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("sargassum_reports")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Keep-alive query failed:", error);
    return NextResponse.json({ error: "Keep-alive query failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    reportCount: count ?? 0,
    ranAt: new Date().toISOString(),
  });
}
