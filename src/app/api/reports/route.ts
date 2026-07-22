import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateReportFields, validatePhotos } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { STORAGE_BUCKET, storagePath } from "@/lib/constants";

// Service-role client + file handling require the Node.js runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Rate limit per IP (SPEC 5)
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.retryAfterMs ?? 0) / 1000);
    return NextResponse.json(
      { error: "Too many reports from this connection. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // Parse multipart form data
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Validate scalar fields
  const validation = validateReportFields({
    latitude: form.get("latitude"),
    longitude: form.get("longitude"),
    severity: form.get("severity"),
    health_impact: form.get("health_impact"),
    comments: form.get("comments"),
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Collect + validate photos
  const photos = form.getAll("photos").filter((v): v is File => v instanceof File);
  const photoCheck = validatePhotos(photos);
  if (!photoCheck.ok) {
    return NextResponse.json({ error: photoCheck.error }, { status: 400 });
  }

  const supabase = createAdminClient();
  const reportId = crypto.randomUUID();

  // Upload photos to Storage with the service role, then collect public URLs.
  const photoUrls: string[] = [];
  try {
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const path = storagePath(reportId, i);
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        return NextResponse.json(
          { error: "Could not upload photos. Please try again." },
          { status: 502 }
        );
      }

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      photoUrls.push(pub.publicUrl);
    }
  } catch (err) {
    console.error("Photo processing error:", err);
    return NextResponse.json(
      { error: "Could not process photos. Please try again." },
      { status: 500 }
    );
  }

  // Insert the report row (created_at + status default server-side).
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const { data, error } = await supabase
    .from("sargassum_reports")
    .insert({
      id: reportId,
      latitude: validation.data.latitude,
      longitude: validation.data.longitude,
      severity: validation.data.severity,
      health_impact: validation.data.health_impact,
      comments: validation.data.comments,
      photo_urls: photoUrls,
      user_agent: userAgent,
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error("Insert failed:", error);
    return NextResponse.json(
      { error: "Could not save your report. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, created_at: data.created_at }, { status: 201 });
}
