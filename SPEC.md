# BVI Sargassum Monitoring — Community Data
## Technical Specification v1.0

**Purpose:** A standalone, public, mobile-first web app for the BVI Department of Conservation and Fisheries. Community members report sargassum sightings — no login, no download, no friction. A password-protected admin dashboard lets the Department view and export all reports.

**This is a fully independent project.** It shares no code, database, hosting, or credentials with Report The Reef. The sibling repo at `../Report-The-Reef` may be READ as a reference for working patterns (Mapbox pin picker, photo compression/upload, Supabase submission flow) but must never be imported from or modified.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router, TypeScript, Tailwind) | `--src-dir` layout: routes live in `src/app/`. NEVER create a folder named `app/` at the project root. |
| Database + Storage | Supabase (dedicated project: `bvi-sargassum`) | Separate from RTR's Supabase project |
| Maps | Mapbox GL JS | Dedicated access token, not RTR's |
| Hosting | Vercel (dedicated project) | Web only. No Capacitor, no TWA, no app stores. |
| PWA | Manifest + icons only | "Add to Home Screen" support. No service worker / offline mode in v1. |

---

## 2. Environment Variables

`.env.local` (git-ignored) and Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only, never exposed to browser
NEXT_PUBLIC_MAPBOX_TOKEN=
ADMIN_PASSWORD=                   # shared password for /admin, checked server-side
ADMIN_SESSION_SECRET=             # random 32+ char string for signing the admin cookie
```

---

## 3. Database Schema (Supabase SQL Editor)

```sql
create table sargassum_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  severity smallint not null check (severity between 1 and 10),
  health_impact smallint not null check (health_impact between 1 and 10),
  comments text,
  photo_urls text[] not null default '{}',
  -- lightweight abuse/QA fields
  user_agent text,
  status text not null default 'new' check (status in ('new','reviewed','hidden'))
);

alter table sargassum_reports enable row level security;

-- Public may INSERT only. No SELECT policy for anon: submissions are write-only
-- from the public side. Admin reads happen server-side via service_role.
create policy "anyone can insert reports"
  on sargassum_reports for insert
  to anon
  with check (true);
```

**Storage:** bucket `sargassum-photos`, public read. Policy: anon may INSERT into this bucket only. Uploaded paths: `reports/{uuid}/{index}.jpg`.

**Note (post-Oct 30, 2026 Supabase rule):** any NEW table added to `public` after that date requires explicit GRANTs before PostgREST/supabase-js can see it, e.g. `grant select, insert, update, delete on new_table to anon, authenticated;`. The table above is created before that date and is unaffected, but future additions need this.

---

## 4. Public Form — `/` (single page, mobile-first)

One vertical flow. Target: submittable in under 60 seconds on a phone, one-handed, in bright sunlight (high contrast, large tap targets).

### 4.1 Header
- App title: **BVI Sargassum Monitoring — Community Data**
- One-line subtitle: "Help the Department of Conservation and Fisheries track sargassum across the territory."
- Keep branding neutral/government-appropriate. Color palette: ocean blues + sargassum gold/amber accent. Clean, official, not playful.

### 4.2 Field 1 — Location (required)
- Mapbox map, initial center `[-64.62, 18.43]` (BVI), zoom ~10.
- Prominent **"Use my location"** button → browser geolocation → drops pin, zooms to ~15.
- User can also tap the map to place the pin, and drag to adjust.
- Show resolved coordinates in small text under the map (4 decimal places).
- Graceful fallback if geolocation is denied: instruct user to tap the map.
- Adapt the pin-picker pattern from RTR's incident location component.

### 4.3 Field 2 — Photos (optional, up to 3)
- Camera-first capture on mobile (`<input type="file" accept="image/*" capture="environment">` pattern) plus gallery pick.
- Client-side compression before upload (reuse RTR's compression approach: max ~1600px long edge, ~0.8 JPEG quality).
- Thumbnail previews with remove buttons.
- Photos upload on submit (not on selection), so abandoning the form leaves no orphaned files.

### 4.4 Field 3 — Severity (required)
- Slider, 1–10, default unset (require an explicit touch; show "Select severity" until moved — or default 5 with a visual "not yet set" state if unset-sliders prove awkward. Prefer explicit selection).
- End labels: **1 — Light scattered patches** · **10 — Massive accumulation / beach unusable**
- Show the selected number large next to the slider.

### 4.5 Field 4 — Health impact (required)
- Slider, 1–10, same interaction pattern.
- End labels: **1 — No effect on me** · **10 — Severe (headaches, breathing difficulty, nausea)**
- Small neutral caption below: "Decomposing sargassum can release hydrogen sulfide gas. Your answer helps the Department monitor community health effects."

### 4.6 Field 5 — Comments (optional)
- Textarea, placeholder: "Anything else? (e.g., smell strength, how long it's been there, wildlife affected)"
- Max 1000 chars with counter.

### 4.7 Submit
- Single large button: **Submit Report**
- Disabled until required fields valid. Loading state while uploading.
- On success → thank-you screen: checkmark, "Thank you — your report has been received by the BVI Department of Conservation and Fisheries," timestamp of submission, and a **"Report another sighting"** button that resets the form.
- Timestamp is `created_at` DB default — nothing collected client-side.
- On failure → keep all entered data, show retry message.

### 4.8 Footer
- "A community data initiative supporting the Government of the Virgin Islands."
- No personal data notice needed beyond: "Reports are anonymous. Location, photos, and answers are shared with the Department."

---

## 5. API Routes

All under `src/app/api/`:

### `POST /api/reports`
- Accepts JSON: `{ latitude, longitude, severity, health_impact, comments }` plus multipart or pre-uploaded photo paths (implementation choice: prefer server-side upload — client sends base64/FormData to this route, route uploads to Storage with service_role, then inserts row; this keeps the anon key's Storage surface minimal).
- Validates: lat between 17.5–19.0, lng between -65.5 and -63.9 (BVI bounding box with margin — reject obviously bogus pins), severity/health 1–10 integers, comments ≤ 1000 chars, ≤ 3 photos, each ≤ 8 MB pre-compression.
- Basic rate limiting: max 10 submissions per IP per hour (in-memory or Vercel KV if available; simple is fine for v1).
- Records `user_agent`.
- Returns `{ id, created_at }`.

### `POST /api/admin/login`
- Body: `{ password }`. Constant-time compare against `ADMIN_PASSWORD`.
- On success: sets an HTTP-only, signed session cookie (use `ADMIN_SESSION_SECRET`), 7-day expiry.

### `GET /api/admin/reports`
- Requires valid admin cookie (middleware or per-route check).
- Query params: `from`, `to` (date range), `status`, `min_severity`.
- Reads via service_role. Returns all fields including photo URLs.

### `PATCH /api/admin/reports/[id]`
- Admin only. Updates `status` (`new` / `reviewed` / `hidden`).

### `GET /api/admin/export`
- Admin only. Streams CSV of filtered reports: `id, created_at (ISO), latitude, longitude, severity, health_impact, comments, photo_urls (semicolon-joined), status`.
- Filename: `sargassum-reports-YYYY-MM-DD.csv`.

---

## 6. Admin Dashboard — `/admin`

### 6.1 Login
- `/admin` with no valid session → password form. Nothing else renders.

### 6.2 Dashboard layout
- **Header stats row:** total reports, reports last 7 days, average severity last 7 days, average health impact last 7 days.
- **Map view:** all reports as pins, colored by severity (green 1–3, amber 4–6, red 7–10). Clicking a pin opens a popup: date, severity, health impact, comment excerpt, photo thumbnails, link to detail.
- **Table view** (toggle or below map): sortable by date/severity/health; columns for date, location (coords, tappable → centers map), severity, health impact, comment, photo count, status dropdown.
- **Filters:** date range, minimum severity, status.
- **Export CSV** button (respects current filters) — this is the feature the Department will use most; make it prominent.
- **Detail view** (modal or row expand): full comment, full-size photos, all metadata, status control.
- `hidden` reports are excluded from stats and map by default (toggle to show).

### 6.3 Security
- All admin data fetches go through the server-side API routes above. `SUPABASE_SERVICE_ROLE_KEY` must never appear in any client bundle. Verify with a production build grep before deploy.

---

## 7. PWA / Meta

- `manifest.json`: name "BVI Sargassum Monitoring", short name "Sargassum BVI", standalone display, theme color matching the palette, 192/512 icons (simple sargassum/wave mark — generate a clean SVG-based icon).
- OpenGraph tags for link sharing (title, description, preview image).
- Mobile viewport meta, iOS home-screen icons.

---

## 8. Explicit Non-Goals (v1)

- No user accounts or login for the public form
- No native app wrappers (no Capacitor, no TWA)
- No offline support / service worker
- No public-facing map of reports (Department may request this later as a "phase 2" — do not build now)
- No mooring, incident, or any Report The Reef feature crossover

---

## 9. Build Order for Claude Code

1. Scaffold Next.js project, Tailwind config, palette tokens, env wiring.
2. Read (do not modify) RTR reference files: Mapbox pin picker, photo compression/upload, incident submission route. Copy and adapt — no cross-repo imports.
3. Public form UI (Section 4), static first, then wire location + photos.
4. `POST /api/reports` with validation + Storage upload + insert. End-to-end submit working.
5. Admin login + session cookie.
6. Admin dashboard: stats, map, table, filters, status control.
7. CSV export.
8. PWA manifest, icons, OG tags.
9. Polish pass: loading states, error states, empty states, mobile testing at 375px width.

## 10. Git Rules (non-negotiable)

- Never use `git push --force` or any destructive override.
- If branches diverge: `git pull --rebase`.
- If a push fails, stop and have Kendyl run `git push` manually in Terminal.
- `.gitignore` must cover `.env.local` and any key files before first commit.
