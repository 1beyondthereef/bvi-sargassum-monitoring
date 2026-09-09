import Link from "next/link";
import { ChevronRight, MapPin, ClipboardList } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const CHOICES = [
  {
    href: "/report",
    title: "Report a Sargassum Landing",
    blurb: "Tell us where sargassum has washed ashore or is floating in a bay.",
    Icon: MapPin,
  },
  {
    href: "/impacts",
    title: "Report Sargassum Impacts",
    blurb: "Share how sargassum is affecting your health, home, or livelihood.",
    Icon: ClipboardList,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader explainer="Help the Ministry track and monitor sargassum across the Territory." />

      {/* Two-function chooser (SPEC-V2 B) */}
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <nav aria-label="What would you like to report?" className="space-y-4">
          {CHOICES.map(({ href, title, blurb, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-xl border border-ocean-100 bg-white p-5 shadow-sm transition hover:border-ocean-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ocean-50 text-ocean-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold leading-snug text-ocean-900">
                  {title}
                </span>
                <span className="mt-1 block text-sm text-ocean-600">{blurb}</span>
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-ocean-400"
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
      </div>

      <SiteFooter note="Reports are anonymous. No login or download required." />
    </main>
  );
}
