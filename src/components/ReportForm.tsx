"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PhotoInput } from "@/components/PhotoInput";
import { ScaleSlider } from "@/components/ScaleSlider";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import type { DrawnArea } from "@/components/MapPicker";
import { compressImages } from "@/lib/image-utils";
import { formatArea } from "@/lib/utils";
import {
  AREA_ESTIMATE_OPTIONS,
  FIELD_LIMITS,
  REPORT_TYPES,
  SHORE_AMOUNT_OPTIONS,
  SHORE_COVERAGE_OPTIONS,
  SHORE_HEIGHT_OPTIONS,
  type ReportType,
} from "@/lib/constants";

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

function SubQuestion({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ocean-800">
        {label}
        {required && <span className="ml-1 text-sargassum-600">*</span>}
      </h3>
      {children}
    </div>
  );
}

export function ReportForm() {
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [severity, setSeverity] = useState<number | null>(null);
  const [health, setHealth] = useState<number | null>(null);
  const [comments, setComments] = useState("");

  // SPEC-V2 C3 — land-based categorical assessment
  const [shoreAmount, setShoreAmount] = useState<string | null>(null);
  const [shoreHeight, setShoreHeight] = useState<string | null>(null);
  const [shoreCoverage, setShoreCoverage] = useState<string | null>(null);
  // SPEC-V2 C2 — drawn extent, with the size dropdown as the fallback
  const [drawnArea, setDrawnArea] = useState<DrawnArea | null>(null);
  const [areaEstimate, setAreaEstimate] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("form");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  const showWater = reportType === "in_water" || reportType === "mixed";
  const showLand = reportType === "land" || reportType === "mixed";
  // C3 replaces the slider for land-based reports; in-water keeps it.
  const showSeverity = reportType === "in_water";

  const isValid = useMemo(() => {
    if (reportType === null || location === null || health === null) return false;
    if (comments.length > FIELD_LIMITS.commentsMaxChars) return false;
    if (showSeverity && severity === null) return false;
    if (showLand && (shoreAmount === null || shoreHeight === null || shoreCoverage === null)) {
      return false;
    }
    return true;
  }, [
    reportType,
    location,
    health,
    comments,
    showSeverity,
    severity,
    showLand,
    shoreAmount,
    shoreHeight,
    shoreCoverage,
  ]);

  const resetForm = () => {
    setReportType(null);
    setLocation(null);
    setPhotos([]);
    setSeverity(null);
    setHealth(null);
    setComments("");
    setShoreAmount(null);
    setShoreHeight(null);
    setShoreCoverage(null);
    setDrawnArea(null);
    setAreaEstimate(null);
    setSubmittedAt(null);
    setErrorMsg(null);
    setPhase("form");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Switching type clears answers that no longer apply, so a report can't carry
  // stale values from a section the user has navigated away from.
  const handleTypeChange = (value: string) => {
    const next = value as ReportType;
    setReportType(next);
    if (next === "in_water") {
      setShoreAmount(null);
      setShoreHeight(null);
      setShoreCoverage(null);
    } else {
      setSeverity(null);
      if (next === "land") {
        setAreaEstimate(null);
        setDrawnArea(null);
      }
    }
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
      body.append("report_type", String(reportType));
      body.append("health_impact", String(health));
      body.append("comments", comments.trim());

      if (showSeverity && severity !== null) {
        body.append("severity", String(severity));
      }
      if (showLand) {
        body.append("shore_amount", String(shoreAmount));
        body.append("shore_height", String(shoreHeight));
        body.append("shore_coverage", String(shoreCoverage));
      }
      if (showWater) {
        if (drawnArea) {
          body.append("area_geojson", JSON.stringify(drawnArea.geojson));
        } else if (areaEstimate) {
          body.append("area_estimate", areaEstimate);
        }
      }

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
          Your report has been received by the Ministry of Environment, Natural
          Resources and Climate Change.
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
  let step = 0;

  return (
    <div ref={topRef} className="mx-auto max-w-md space-y-4 px-4 py-6">
      {/* 1 — Stranding type (SPEC-V2 C1) */}
      <FieldCard
        index={++step}
        title="What are you reporting?"
        required
        caption="This decides which questions we ask next."
      >
        <ChoiceGroup
          name="report-type"
          options={REPORT_TYPES}
          value={reportType}
          onChange={handleTypeChange}
          ariaLabel="Type of sargassum stranding"
        />
      </FieldCard>

      {reportType && (
        <>
          <FieldCard
            index={++step}
            title="Location"
            required
            caption={
              showWater
                ? "Drop a pin, and use Draw area to outline the affected water."
                : undefined
            }
          >
            <MapPicker
              onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
              className="h-[320px]"
              enableAreaDraw={showWater}
              onAreaChange={setDrawnArea}
            />
          </FieldCard>

          {showWater && (
            <FieldCard
              index={++step}
              title="Extent in the water"
              caption={
                drawnArea
                  ? undefined
                  : "If you'd rather not draw the area, give us a rough size instead."
              }
            >
              {drawnArea ? (
                <p className="text-sm text-ocean-700">
                  Using your drawn area of{" "}
                  <span className="font-semibold">
                    {formatArea(drawnArea.squareMeters)}
                  </span>
                  . Clear it on the map above if you&apos;d rather pick a rough
                  size instead.
                </p>
              ) : (
                <ChoiceGroup
                  name="area-estimate"
                  options={AREA_ESTIMATE_OPTIONS}
                  value={areaEstimate}
                  onChange={setAreaEstimate}
                  ariaLabel="Estimated size of the affected water area"
                />
              )}
            </FieldCard>
          )}

          {showLand && (
            <FieldCard index={++step} title="Shoreline assessment" required>
              <div className="space-y-5">
                <SubQuestion label="Amount" required>
                  <ChoiceGroup
                    name="shore-amount"
                    options={SHORE_AMOUNT_OPTIONS}
                    value={shoreAmount}
                    onChange={setShoreAmount}
                    ariaLabel="Amount of sargassum on the shoreline"
                  />
                </SubQuestion>

                <SubQuestion label="Seaweed height" required>
                  <ChoiceGroup
                    name="shore-height"
                    options={SHORE_HEIGHT_OPTIONS}
                    value={shoreHeight}
                    onChange={setShoreHeight}
                    ariaLabel="Depth of the sargassum"
                  />
                </SubQuestion>

                <SubQuestion label="Shoreline coverage" required>
                  <ChoiceGroup
                    name="shore-coverage"
                    options={SHORE_COVERAGE_OPTIONS}
                    value={shoreCoverage}
                    onChange={setShoreCoverage}
                    ariaLabel="Share of the shoreline affected"
                  />
                </SubQuestion>
              </div>
            </FieldCard>
          )}

          <FieldCard
            index={++step}
            title="Photos"
            caption="Add up to 3 photos of the sargassum."
          >
            <PhotoInput value={photos} onChange={setPhotos} />
          </FieldCard>

          {showSeverity && (
            <FieldCard index={++step} title="Severity" required>
              <ScaleSlider
                value={severity}
                onChange={setSeverity}
                ariaLabel="Severity, 1 to 10"
                unsetHint="Select severity"
                minLabel="Light scattered patches"
                maxLabel="Massive accumulation / bay unusable"
              />
            </FieldCard>
          )}

          <FieldCard
            index={++step}
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

          <FieldCard index={++step} title="Comments">
            <textarea
              value={comments}
              onChange={(e) =>
                setComments(e.target.value.slice(0, FIELD_LIMITS.commentsMaxChars))
              }
              rows={4}
              placeholder="Anything else? (e.g., smell strength, how long it's been there, wildlife affected)"
              className="w-full resize-none rounded-lg border border-ocean-300 p-3 text-base text-ocean-900 placeholder:text-ocean-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200"
            />
            <p className="mt-1 text-right text-xs text-ocean-500">
              {comments.length}/{FIELD_LIMITS.commentsMaxChars}
            </p>
          </FieldCard>

          {errorMsg && (
            <p
              className="rounded-lg bg-sargassum-50 px-4 py-3 text-sm text-sargassum-800"
              role="alert"
            >
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
              Answer the required questions marked
              <span className="mx-1 text-sargassum-600">*</span>
              to submit.
            </p>
          )}
        </>
      )}
    </div>
  );
}
