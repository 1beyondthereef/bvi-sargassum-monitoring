# BVI Sargassum Monitoring — v2 Addendum
## Working Group Revisions to SPEC.md

This document extends SPEC.md. Where they conflict, this addendum wins. Everything in SPEC.md not amended here (stack, admin auth pattern, API conventions, git rules, security rules) still applies.

**Source:** Ministry Working Group feedback on the v1 build.

---

## A. Branding

- Governing body is the **Ministry of Environment, Natural Resources and Climate Change**. Update all user-facing text, README, thank-you screen, and footer accordingly.
- Ministry logo will be provided at `public/ministry-logo.png`. Display it in the header. Keep the sargassum specimen images and existing palette/typography unless they clash with the logo — show Kendyl a header mockup before finalizing.
- Footer: "An initiative of the Ministry of Environment, Natural Resources and Climate Change, Government of the Virgin Islands." (Kendyl to confirm exact wording.)

## B. New top-level structure — two functions

The homepage becomes a simple chooser with two large, mobile-friendly buttons:

1. **Report a Sargassum Landing** → the reporting flow (Section C)
2. **Report Sargassum Impacts** → the profiles screen (Section D)

Keep the chooser screen minimal: logo, title, one-line explainer per button. The v1 form's map/photo/comments machinery moves into the Landing flow.

## C. Function 1 — Report a Sargassum Landing

### C1. Stranding type selector (first question)
Three options, required:
- **In-water stranding**
- **Land-based (shoreline) stranding**
- **Mixed** (both)

The type determines which sections below appear.

### C2. In-water strandings — area drawing
- Use a **map draw feature** (Mapbox GL Draw, polygon mode) — the Working Group offered a tile-grid alternative but agreed drawing is acceptable and it is simpler and more accurate. Users draw the affected area in the bay with finger or mouse.
- UX: "Draw" button enters draw mode → user taps points around the affected water area → double-tap/tap-first-point to close the polygon → polygon shown with editable vertices → "Redraw" to start over.
- Compute and display the approximate area (hectares or km²) client-side for user confirmation.
- Allow multiple polygons per report (multiple patches in one bay) — v2 may ship with one polygon if multiple adds complexity; note which was built.
- Fallback: if the user can't/won't draw, allow a single dropped pin (v1 behavior) with an optional "estimated extent" dropdown: Small (<0.5 ha) / Medium (0.5–2 ha) / Large (2–10 ha) / Very large (>10 ha).

### C3. Land-based strandings — categorical assessment
Replace the 1–10 severity slider (for this type) with structured categories:
- **Amount:** Light / Moderate / Heavy (required) — with one-line descriptors:
  - Light: scattered patches, beach fully usable
  - Moderate: continuous windrows, parts of beach affected
  - Heavy: thick accumulation, beach largely unusable
- **Seaweed height:** Ankle-deep (<10 cm) / Knee-deep (10–50 cm) / Waist-deep or more (>50 cm) (required)
- **Shoreline coverage:** <25% / 25–50% / 50–75% / >75% of visible shoreline (required)
- Location: dropped pin (v1 map picker), required.

### C4. Mixed strandings
Show BOTH the in-water drawing tools (C2) and the land-based categories (C3). Location pin required; polygon(s) for the in-water portion.

### C5. Retained from v1 (all stranding types)
- Photos (up to 3, compressed, existing pipeline)
- Comments (≤1000 chars)
- Auto timestamp
- Anonymous, no login

### C6. Impact questions within the landing report
Replace the single 1–10 health slider with a structured, optional "Did you experience any impacts?" section (all optional, checkbox groups + free text):
- **Health:** none / eye irritation / respiratory irritation / headache / nausea / skin irritation / other (free text). NOTE: final option list to be reviewed by the Environmental Health Division, Ministry of Health and Social Development — build with these placeholders and mark clearly for review.
- **Household/property:** none / odor in home / corrosion (metals, electronics) / property damage / other (free text)
- **Environmental:** none / discolored water / dead fish or marine life / water quality concerns / other (free text)
- **Fishing & boating:** none / fouled gear / blocked ramp or mooring / engine intake issues / navigation hazard / other (free text)
- **Economic:** none / lost bookings or customers / cleanup costs / lost fishing income / other (free text)

## D. Function 2 — Report Sargassum Impacts

- Screen with four large profile buttons: **Resident / Tourist / Tourism Operator / Fisherfolk**
- Each routes to an external SurveyMonkey link. Links NOT yet available — build with placeholder URLs in a single config file (`src/lib/survey-links.ts`) so they're a 30-second swap later.
- Until real links exist, tapping a profile shows a friendly "This survey is coming soon" screen (do not link to placeholder URLs in production).
- Brief explainer text on the screen: impacts can be reported any time, independent of a specific landing event, to document long-term effects.

## E. Database changes

Run in Supabase SQL Editor (migration for existing table):

```sql
alter table sargassum_reports
  add column report_type text check (report_type in ('in_water','land','mixed')),
  add column area_geojson jsonb,                -- polygon(s) for in-water extent
  add column area_estimate text,                -- fallback size class when no polygon
  add column shore_amount text check (shore_amount in ('light','moderate','heavy')),
  add column shore_height text,                 -- ankle/knee/waist class
  add column shore_coverage text,               -- <25 / 25-50 / 50-75 / >75 class
  add column impacts jsonb;                     -- structured impact answers (C6)

-- Existing severity / health_impact columns: keep for v1 rows; new rows may leave
-- them null. Relax NOT NULL:
alter table sargassum_reports
  alter column severity drop not null,
  alter column health_impact drop not null;
```

Validation moves accordingly: `report_type` required; polygon or pin required per type; category fields required per type as specified above.

## F. Admin dashboard updates

- Map: render in-water polygons (semi-transparent fill) as well as pins. Color by shore_amount or computed size class.
- Table: add report_type column and the categorical fields; filters for report_type and shore_amount.
- Detail view: show polygon on a mini-map, structured impact answers grouped by category.
- CSV export: include all new fields; serialize area_geojson as WKT or GeoJSON string in its own column; flatten impacts to one column per category (semicolon-joined selections + free text).

## G. Build order

1. Branding pass (Ministry name everywhere, logo in header) — small, do first.
2. Homepage chooser + routing skeleton for both functions (Impacts screen with placeholder profiles).
3. Landing flow restructure: type selector + land-based categorical form (C3) — reuses the most v1 machinery.
4. In-water drawing (C2) — the biggest new piece; Mapbox GL Draw integration.
5. Mixed type (C4) — composition of 2+3.
6. Structured impacts section (C6) with placeholder health options.
7. DB migration + API validation updates + admin dashboard updates + CSV.
8. Survey links config + coming-soon screens.

Pause for Kendyl's review after steps 2, 4, and 7.

## H. Explicitly deferred / pending external input

- SurveyMonkey URLs (Kendyl will provide)
- Final health impact option list (Environmental Health Division review)
- Exact footer/attribution wording (Ministry preference)
