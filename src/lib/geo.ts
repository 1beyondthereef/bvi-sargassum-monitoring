import type { FeatureCollection } from "geojson";

export interface LatLng {
  lat: number;
  lng: number;
}

interface WeightedPoint {
  x: number;
  y: number;
  weight: number;
}

/**
 * Area-weighted centre of a polygon ring (shoelace formula). Returns null for a
 * zero-area ring so the caller can fall back to averaging its vertices.
 *
 * Treated as planar: across a single BVI bay the error is far below the
 * precision a dropped pin carries anyway.
 */
function ringCentroid(ring: number[][]): WeightedPoint | null {
  let twiceArea = 0;
  let x = 0;
  let y = 0;

  // Modulo wrap handles both closed rings (where the repeated point
  // contributes nothing) and unclosed ones.
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }

  if (twiceArea === 0) return null;
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea), weight: Math.abs(twiceArea / 2) };
}

function outerRings(geojson: FeatureCollection): number[][][] {
  const rings: number[][][] = [];
  for (const feature of geojson.features ?? []) {
    const geometry = feature?.geometry;
    if (geometry?.type !== "Polygon") continue;
    const ring = geometry.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 3) continue;
    if (ring.every((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))) {
      rings.push(ring as number[][]);
    }
  }
  return rings;
}

/**
 * Centre of one or more drawn extents, used to stand in for a dropped pin when
 * an in-water reporter outlined the sargassum but never tapped the map
 * (SPEC-V2 C2). Multiple patches combine weighted by area, so the point lands
 * nearer the larger patch.
 *
 * Only outer rings count; the draw tool cannot produce holes.
 */
export function polygonsCentroid(
  geojson: FeatureCollection | null | undefined
): LatLng | null {
  if (!geojson?.features?.length) return null;
  const rings = outerRings(geojson);
  if (rings.length === 0) return null;

  let sumX = 0;
  let sumY = 0;
  let sumWeight = 0;
  for (const ring of rings) {
    const centre = ringCentroid(ring);
    if (!centre || !Number.isFinite(centre.x) || !Number.isFinite(centre.y)) continue;
    sumX += centre.x * centre.weight;
    sumY += centre.y * centre.weight;
    sumWeight += centre.weight;
  }

  // Every ring was zero-area (a line or a point) — average the vertices rather
  // than give up, since the reporter still indicated roughly where they meant.
  if (sumWeight === 0) {
    let count = 0;
    sumX = 0;
    sumY = 0;
    for (const ring of rings) {
      for (const [x, y] of ring) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
    if (count === 0) return null;
    const lng = sumX / count;
    const lat = sumY / count;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  const lng = sumX / sumWeight;
  const lat = sumY / sumWeight;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
