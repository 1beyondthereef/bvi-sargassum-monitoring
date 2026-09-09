import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ImpactProfiles } from "@/components/ImpactProfiles";

export const metadata: Metadata = {
  title: "Report Sargassum Impacts — BVI Sargassum Monitoring",
  description:
    "Tell the Ministry how sargassum is affecting your health, household, business, or fishing.",
};

export default function ImpactsPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader
        backHref="/"
        backLabel="All reporting options"
        explainer="Share how sargassum is affecting your health, home, or livelihood."
      />

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <p className="mb-6 text-sm text-ocean-700">
          Impacts can be reported at any time — you do not need to wait for a
          specific landing event. These responses help the Ministry document the
          long-term effects of sargassum across the Territory.
        </p>

        <h2 className="mb-3 font-display text-base font-bold text-ocean-900">
          Which best describes you?
        </h2>

        <ImpactProfiles />
      </div>

      <SiteFooter />
    </main>
  );
}
