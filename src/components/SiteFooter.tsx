import { MINISTRY_ATTRIBUTION } from "@/lib/constants";

interface SiteFooterProps {
  /** Shown under the attribution on screens that collect a report. */
  note?: string;
}

export function SiteFooter({ note }: SiteFooterProps) {
  return (
    <footer className="mx-auto max-w-md px-5 py-8 text-center">
      <p className="text-xs text-ocean-700">{MINISTRY_ATTRIBUTION}</p>
      {note && <p className="mt-2 text-xs text-ocean-500">{note}</p>}
    </footer>
  );
}
