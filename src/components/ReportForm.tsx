"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PhotoInput } from "@/components/PhotoInput";
import { ScaleSlider } from "@/components/ScaleSlider";
import { compressImages } from "@/lib/image-utils";
import { FIELD_LIMITS } from "@/lib/constants";

// Mapbox touches `window`, so load the picker client-side only.
const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-ocean-200 bg-ocean-50 text-sm text-ocean-700">
      Loading map…
    </div>
  ),
});

type Phase = "form" | "submitting" | "success" | "error";

function FieldCard({
  index,
  title,
  required,
  children,
  caption,
}: {
  index: number;
  title: string;
  required?: boolean;
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <section className="rounded-xl border border-ocean-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ocean-600 text-xs font-bold text-white">
          {index}
        </span>
        <h2 className="text-base font-semibold text-ocean-900">
          {title}
          {required ? (
            <span className="ml-1 text-sargassum-600">*</span>
          ) : (
            <span className="ml-1 text-sm font-normal text-ocean-500">(optional)</span>
          )}
        </h2>
      </div>
      {caption && <p className="mb-3 text-sm text-ocean-600">{caption}</p>}
      {children}
    </section>
  );
}

export function ReportForm() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [severity, setSeverity] = useState<number | null>(null);
  const [health, setHealth] = useState<number | null>(null);
  const [comments, setComments] = useState("");

  const [phase, setPhase] = useState<Phase>("form");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  const isValid = useMemo(
    () =>
      location !== null &&
      severity !== null &&
      health !== null &&
      comments.length <= FIELD_LIMITS.commentsMaxChars,
    [location, severity, health, comments]
  );

  const resetForm = () => {
    setLocation(null);
    setPhotos([]);
    setSeverity(null);
    setHealth(null);
    setComments("");
    setSubmittedAt(null);
    setErrorMsg(null);
    setPhase("form");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setPhase("submitting");
    setErrorMsg(null);
    try {
      // Photos are compressed on submit (max ~1600px long edge, ~0.8 quality).
      const compressed = await compressImages(photos);

      const body = new FormData();
      body.append("latitude", String(location!.lat));
      body.append("longitude", String(location!.lng));
      body.append("severity", String(severity));
      body.append("health_impact", String(health));
      body.append("comments", comments.trim());
      compressed.forEach((file, i) => body.append("photos", file, `photo-${i}.jpg`));

      const res = await fetch("/api/reports", { method: "POST", body });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || "Submission failed.");
      }

      setSubmittedAt(payload.created_at ?? new Date().toISOString());
      setPhase("success");
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error("Submit failed:", err);
      setErrorMsg(
        err instanceof Error && err.message
          ? `${err.message} Your details are still here — please try again.`
          : "Something went wrong sending your report. Your details are still here — please try again."
      );
      setPhase("error");
    }
  };

  if (phase === "success") {
    return (
      <div ref={topRef} className="mx-auto max-w-md px-4 py-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-severity-low" />
        <h2 className="mt-4 text-xl font-bold text-ocean-900">Thank you</h2>
        <p className="mt-2 text-ocean-700">
          Your report has been received by the Ministry of Environment, Natural Resources &amp; Climate Change.
        </p>
        {submittedAt && (
          <p className="mt-2 text-sm text-ocean-500">
            Submitted {new Date(submittedAt).toLocaleString()}
          </p>
        )}
        <button
          type="button"
          onClick={resetForm}
          className="mt-6 w-full rounded-lg bg-ocean-600 px-4 py-3 text-base font-semibold text-white hover:bg-ocean-700"
        >
          Report another sighting
        </button>
      </div>
    );
  }

  const submitting = phase === "submitting";

  return (
    <div ref={topRef} className="mx-auto max-w-md space-y-4 px-4 py-6">
      {/* 1 — Location */}
      <FieldCard index={1} title="Location" required>
        <MapPicker onLocationSelect={(lat, lng) => setLocation({ lat, lng })} className="h-[320px]" />
      </FieldCard>

      {/* 2 — Photos */}
      <FieldCard index={2} title="Photos" caption="Add up to 3 photos of the sargassum.">
        <PhotoInput value={photos} onChange={setPhotos} />
      </FieldCard>

      {/* 3 — Severity */}
      <FieldCard index={3} title="Severity" required>
        <ScaleSlider
          value={severity}
          onChange={setSeverity}
          ariaLabel="Severity, 1 to 10"
          unsetHint="Select severity"
          minLabel="Light scattered patches"
          maxLabel="Massive accumulation / beach unusable"
        />
      </FieldCard>

      {/* 4 — Health impact */}
      <FieldCard
        index={4}
        title="Health impact"
        required
          caption="Decomposing sargassum can release hydrogen sulfide gas. Your answer helps the Ministry monitor community health effects."
      >
        <ScaleSlider
          value={health}
          onChange={setHealth}
          ariaLabel="Health impact, 1 to 10"
          unsetHint="Select health impact"
          minLabel="No effect on me"
          maxLabel="Severe (headaches, breathing difficulty, nausea)"
        />
      </FieldCard>

      {/* 5 — Comments */}
      <FieldCard index={5} title="Comments">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, FIELD_LIMITS.commentsMaxChars))}
          rows={4}
          placeholder="Anything else? (e.g., smell strength, how long it's been there, wildlife affected)"
          className="w-full resize-none rounded-lg border border-ocean-300 p-3 text-base text-ocean-900 placeholder:text-ocean-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200"
        />
        <p className="mt-1 text-right text-xs text-ocean-500">
          {comments.length}/{FIELD_LIMITS.commentsMaxChars}
        </p>
      </FieldCard>

      {errorMsg && (
        <p className="rounded-lg bg-sargassum-50 px-4 py-3 text-sm text-sargassum-800" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ocean-700 px-4 py-4 text-lg font-bold text-white shadow-sm transition-colors hover:bg-ocean-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit Report"
        )}
      </button>

      {!isValid && (
        <p className="text-center text-xs text-ocean-500">
          Add a location and set severity and health impact to submit.
        </p>
      )}
    </div>
  );
}
