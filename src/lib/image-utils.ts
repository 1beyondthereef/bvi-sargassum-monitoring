/**
 * Client-side image compression / resizing.
 * Adapted from Report The Reef's image-utils (canvas re-encode approach),
 * tuned to this project's target: max ~1600px long edge, ~0.8 JPEG quality.
 */

import { PHOTO_LIMITS } from "@/lib/constants";

export interface CompressionOptions {
  maxLongEdge?: number;
  quality?: number; // 0-1
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxLongEdge: PHOTO_LIMITS.compression.maxLongEdge, // 1600
  quality: PHOTO_LIMITS.compression.quality, // 0.8
};

const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"];

export function isCompressibleImage(file: File): boolean {
  return COMPRESSIBLE.includes(file.type);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Scale dimensions so the longest edge is at most maxLongEdge (never upscales). */
function fitLongEdge(width: number, height: number, maxLongEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Compress + resize an image to a JPEG. Returns the compressed File, or the
 * original if it isn't a compressible image or compression fails / grows it.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  if (!isCompressibleImage(file)) return file;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const img = await loadImage(file);
    const { width, height } = fitLongEdge(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxLongEdge
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(img.src);
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(img.src);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", opts.quality);
    });
    if (!blob) return file;

    const compressed = new File(
      [blob],
      file.name.replace(/\.(jpe?g|png|webp)$/i, ".jpg"),
      { type: "image/jpeg" }
    );

    return compressed.size < file.size ? compressed : file;
  } catch (error) {
    console.error("Image compression failed:", error);
    return file;
  }
}

/** Compress several images in parallel. */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}
