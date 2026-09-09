import type { Metadata } from "next";
import { ReportForm } from "@/components/ReportForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Report a Sargassum Landing — BVI Sargassum Monitoring",
  description:
    "Report where sargassum has washed ashore or is floating in a bay in the Virgin Islands.",
};

export default function ReportLandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader
        backHref="/"
        backLabel="All reporting options"
        explainer="Report where sargassum has washed ashore or is floating in a bay."
      />

      <div className="flex-1">
        <ReportForm />
      </div>

      <SiteFooter note="Reports are anonymous. Location, photos, and answers are shared with the Ministry." />
    </main>
  );
}
