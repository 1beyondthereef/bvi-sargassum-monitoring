import { RATE_LIMIT } from "@/lib/constants";

/**
 * Very small in-memory sliding-window rate limiter (SPEC 5).
 * Suitable for v1 / single-instance. Not durable across serverless cold starts
 * or multiple instances — swap for Vercel KV later if stricter limits are needed.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;

  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= RATE_LIMIT.maxSubmissionsPerHour) {
    const oldest = recent[0];
    return { allowed: false, retryAfterMs: oldest + RATE_LIMIT.windowMs - now };
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    hits.forEach((times, k) => {
      const kept = times.filter((t) => t > windowStart);
      if (kept.length === 0) hits.delete(k);
      else hits.set(k, kept);
    });
  }

  return { allowed: true };
}

/** Best-effort client IP from proxy headers. */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
