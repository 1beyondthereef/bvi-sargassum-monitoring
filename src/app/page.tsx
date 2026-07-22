export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="bg-ocean-700 px-5 py-6 text-white">
        <h1 className="text-xl font-bold leading-tight">
          BVI Sargassum Monitoring
          <span className="block text-sm font-medium text-ocean-100">
            Community Data
          </span>
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ocean-50">
          Help the Department of Conservation and Fisheries track sargassum
          across the territory.
        </p>
      </header>

      <section className="mx-auto max-w-md px-5 py-8">
        <div className="rounded-xl border border-ocean-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-ocean-800">
            Project scaffold is in place. The public reporting form will be
            built next.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full bg-severity-low" />
            <span className="inline-block h-4 w-4 rounded-full bg-severity-mid" />
            <span className="inline-block h-4 w-4 rounded-full bg-severity-high" />
            <span className="ml-2 text-xs text-ocean-600">severity scale</span>
          </div>
          <button
            type="button"
            className="mt-5 w-full rounded-lg bg-sargassum-500 px-4 py-3 text-base font-semibold text-sargassum-950 transition-colors hover:bg-sargassum-400"
          >
            Accent button (sargassum gold)
          </button>
        </div>
      </section>

      <footer className="px-5 py-6 text-center text-xs text-ocean-700">
        A community data initiative supporting the Government of the Virgin
        Islands.
      </footer>
    </main>
  );
}
