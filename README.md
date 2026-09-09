# BVI Sargassum Monitoring — Community Generated Data

A public, mobile-first web app for the BVI Ministry of Environment, Natural
Resources and Climate Change. Community members report sargassum sightings — no
login, no download, no friction — and a password-protected admin dashboard lets
the Ministry view, filter, and export all reports.

- **Home** (`/`) — chooser between the two reporting functions.
- **Report a Sargassum Landing** (`/report`) — see below.
- **Report Sargassum Impacts** (`/impacts`) — Resident / Tourist / Tourism
  Operator / Fisherfolk profiles routing to external surveys. Links are pending,
  so profiles currently show a "coming soon" screen — see
  `src/lib/survey-links.ts`.
- **Admin dashboard** (`/admin`) — password login, headline stats, a
  severity-colored map with drawn extents, a sortable/filterable table,
  per-report status controls, and CSV export.

### The landing report

The first question is the stranding type, and it decides what the rest of the
form asks (SPEC-V2 C1):

| Type | Extent | Assessment |
| --- | --- | --- |
| In-water | Drawn polygon(s), or a size-class fallback | 1–10 severity slider |
| Land-based | — | Amount / seaweed height / shoreline coverage |
| Mixed | Drawn polygon(s), or a size-class fallback | Amount / seaweed height / shoreline coverage |

All three types also take a location pin, up to 3 photos (compressed
client-side, uploaded on submit), the optional impact questions, and comments.

**Multiple polygons per report are supported** (SPEC-V2 C2 left this optional).
"Draw another" adds a patch, the readout sums their area, and the server accepts
up to `AREA_LIMITS.maxPolygons` per report.

The 1–10 health slider was replaced by five optional impact categories — health,
household/property, environmental, fishing & boating, economic — each a checkbox
group plus free text, stored as JSON in `impacts` (SPEC-V2 C6). Ticking "None"
clears the rest of its group, which is how the dashboard distinguishes "reported
no impact" from "skipped the section".

The health options are labelled **"Draft — pending Environmental Health Division
review"** in the form and are not final; edit `IMPACT_CATEGORIES` in
`src/lib/constants.ts` once the Ministry of Health and Social Development signs
off. Option codes are stored, not labels, so rewording an option does not
invalidate existing rows.

Reports submitted before v2 keep their `severity` and `health_impact` values and
still render; new rows leave `health_impact` null.

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
CRON_SECRET=                       # Random 32+ char string; authorizes the daily keep-alive cron
```

Notes:
- `NEXT_PUBLIC_SUPABASE_URL` must be the bare project origin. The app also
  tolerates a trailing path/slash by normalizing to the origin.
- `NEXT_PUBLIC_*` variables are exposed to the browser by design; the others
  are server-only.

## Database & storage

The Supabase table (`sargassum_reports`) and public Storage bucket
(`sargassum-photos`) already exist. Schema and policies are documented in
`SPEC.md` (Section 3), with the v2 columns added by the migration in `SPEC-V2.md`
(Section E) — that migration has been applied. Public users can INSERT only; all
admin reads and photo uploads happen server-side via the service role.

## Pending external input

Three things are deliberately stubbed, each in one place:

- **Survey URLs** — `src/lib/survey-links.ts`. Every profile has `url: null`,
  which renders the "coming soon" screen. Paste a real SurveyMonkey link in and
  that profile starts routing out immediately; nothing else changes. Do not ship
  placeholder URLs.
- **Health impact options** — `IMPACT_CATEGORIES` in `src/lib/constants.ts`,
  awaiting Environmental Health Division review.
- **Footer attribution wording** — `MINISTRY_ATTRIBUTION` in
  `src/lib/constants.ts`, awaiting Ministry confirmation.

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

## Keep-alive cron

Supabase pauses free-tier projects after roughly 7 consecutive days of
inactivity. `vercel.json` schedules `GET /api/cron/keep-alive` daily at 12:00
UTC (08:00 in the BVI); the route runs a `head`-only row count, so it touches
the database without transferring rows.

The route is protected: it requires `Authorization: Bearer $CRON_SECRET` and
returns 401 for every request when `CRON_SECRET` is unset. Vercel attaches that
header automatically to scheduled invocations once `CRON_SECRET` exists in the
project's environment variables. Crons only run from a production deployment on
the default branch, and Hobby projects are limited to one run per day (fired
within the scheduled hour rather than exactly on it).
