import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MINISTRY_LOGO_ALT } from "@/lib/constants";

interface SiteHeaderProps {
  /** One-line explainer shown under the title. */
  explainer?: string;
  /** Renders a back link in the title band when set. */
  backHref?: string;
  backLabel?: string;
}

/**
 * Shared public header (SPEC-V2 A).
 *
 * The official lockup is black text on a transparent background, so it gets its
 * own white band rather than sitting on the ocean-blue title band, which would
 * leave it unreadable.
 */
export function SiteHeader({ explainer, backHref, backLabel = "Back" }: SiteHeaderProps) {
  return (
    <header>
      <div className="bg-white px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ministry-logo.png"
          alt={MINISTRY_LOGO_ALT}
          className="mx-auto h-auto w-full max-w-[240px] sm:max-w-[300px]"
        />
      </div>

      <div className="bg-ocean-700 px-5 py-6 text-white">
        {backHref && (
          <Link
            href={backHref}
            className="mx-auto mb-3 flex max-w-md items-center gap-1 text-sm font-semibold text-ocean-50 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>
        )}

        <div className="mx-auto flex max-w-md items-center justify-center gap-3 sm:gap-5">
          {/* Decorative specimen — original orientation (left) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sargassum.png"
            alt=""
            aria-hidden="true"
            className="hidden h-16 w-auto shrink-0 select-none object-contain drop-shadow-sm min-[400px]:block sm:h-20"
          />

          <div className="min-w-0 text-center">
            <h1 className="text-2xl font-bold leading-tight">
              BVI Sargassum Monitoring
              <span className="block text-base font-semibold text-sargassum-300">
                Community Generated Data
              </span>
            </h1>
          </div>

          {/* Decorative specimen — mirrored horizontally (right) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sargassum.png"
            alt=""
            aria-hidden="true"
            className="hidden h-16 w-auto shrink-0 -scale-x-100 select-none object-contain drop-shadow-sm min-[400px]:block sm:h-20"
          />
        </div>

        {explainer && (
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-ocean-50">
            {explainer}
          </p>
        )}
      </div>
    </header>
  );
}
