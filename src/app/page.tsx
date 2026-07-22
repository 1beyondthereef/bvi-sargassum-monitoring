import { ReportForm } from "@/components/ReportForm";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Header (4.1) */}
      <header className="bg-ocean-700 px-5 py-6 text-white">
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

        <p className="mx-auto mt-3 max-w-md text-center text-sm text-ocean-50">
          Help the Ministry of Environment, Natural Resources &amp; Climate
          Change track and monitor sargassum across the Territory.
        </p>
      </header>

      {/* Public reporting form (Section 4) */}
      <ReportForm />

      {/* Footer (4.8) */}
      <footer className="mx-auto max-w-md px-5 py-8 text-center">
        <p className="text-xs text-ocean-700">
          A community data initiative supporting the Government of the Virgin
          Islands.
        </p>
        <p className="mt-2 text-xs text-ocean-500">
          Reports are anonymous. Location, photos, and answers are shared with
          the Ministry.
        </p>
      </footer>
    </main>
  );
}
