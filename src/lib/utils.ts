import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Human-readable area for a drawn extent (SPEC-V2 C2). Hectares read better at
 * bay scale; anything larger is clearer in km².
 */
export function formatArea(squareMeters: number): string {
  const hectares = squareMeters / 10_000;
  if (hectares < 1) return `${hectares.toFixed(2)} ha`;
  if (hectares < 100) return `${hectares.toFixed(1)} ha`;
  return `${(squareMeters / 1_000_000).toFixed(2)} km²`;
}
