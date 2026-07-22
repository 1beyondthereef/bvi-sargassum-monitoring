# BVI Sargassum Monitoring — Community Generated Data

A public, mobile-first web app for the BVI Ministry of Environment, Natural
Resources & Climate Change. Community members report sargassum sightings —
no login, no download, no friction — and a password-protected admin dashboard
lets the Ministry view, filter, and export all reports.

- **Public form** (`/`) — location (Mapbox pin picker), up to 3 photos
  (compressed client-side, uploaded on submit), severity and health-impact
  sliders (1–10), and optional comments.
- **Admin dashboard** (`/admin`) — password login, headline stats, a
  severity-colored map, a sortable/filterable table, per-report status
  controls, and CSV export.

## Stack

- Next.js 14 (App Router, TypeScript, `--src-dir` layout)
- Tailwind CSS
- Supabase (Postgres + Storage)
- Mapbox GL JS
- Deployed on Vercel (web only — no native wrappers, no service worker in v1)

## Environment variables

Create `.env.local` in the project root (git-ignored). Names only — fill in
your own values:

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL (https://<ref>.supabase.co — no path)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Server-side only; never exposed to the browser
NEXT_PUBLIC_MAPBOX_TOKEN=          # Mapbox GL access token
ADMIN_PASSWORD=                    # Shared password for /admin, checked server-side
ADMIN_SESSION_SECRET=              # Random 32+ char string used to sign the admin cookie
NEXT_PUBLIC_SITE_URL=              # Public site origin, used for OpenGraph/link previews (e.g. https://your-app.vercel.app)
```

Notes:
- `NEXT_PUBLIC_SUPABASE_URL` must be the bare project origin. The app also
  tolerates a trailing path/slash by normalizing to the origin.
- `NEXT_PUBLIC_*` variables are exposed to the browser by design; the others
  are server-only.

## Database & storage

The Supabase table (`sargassum_reports`) and public Storage bucket
(`sargassum-photos`) already exist. Schema and policies are documented in
`SPEC.md` (Section 3). Public users can INSERT only; all admin reads and photo
uploads happen server-side via the service role.

## Run locally

```bash
npm install
# add .env.local with the variables above
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm start            # serve the production build
npm run lint         # eslint
```

## Deploy (Vercel)

Add every variable listed above (including `NEXT_PUBLIC_SITE_URL`) in the
Vercel project's Environment Variables, then deploy. Nothing else is required —
this is a standalone web project.
