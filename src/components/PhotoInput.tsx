"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { PHOTO_LIMITS } from "@/lib/constants";

interface PhotoInputProps {
  value: File[];
  onChange: (files: File[]) => void;
}

/**
 * Photo picker — up to 3 images, camera-first capture plus gallery.
 * Files are held in state and compressed/uploaded on submit (not on selection),
 * so abandoning the form leaves no orphaned uploads.
 */
export function PhotoInput({ value, onChange }: PhotoInputProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Build/revoke object URLs for previews
  useEffect(() => {
    const urls = value.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [value]);

  const remaining = PHOTO_LIMITS.maxCount - value.length;

  const addFiles = (fileList: FileList | null) => {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const accepted: File[] = [];

    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files can be added.");
        continue;
      }
      if (file.size > PHOTO_LIMITS.maxBytesPreCompression) {
        setError(`Each photo must be under ${PHOTO_LIMITS.maxBytesPreCompression / 1024 / 1024} MB.`);
        continue;
      }
      accepted.push(file);
    }

    const next = [...value, ...accepted].slice(0, PHOTO_LIMITS.maxCount);
    if (value.length + accepted.length > PHOTO_LIMITS.maxCount) {
      setError(`You can add up to ${PHOTO_LIMITS.maxCount} photos.`);
    }
    onChange(next);
  };

  const removeAt = (index: number) => {
    setError(null);
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative aspect-square overflow-hidden rounded-lg border border-ocean-200 bg-ocean-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[i]}
                alt={`Photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add buttons */}
      {remaining > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-ocean-300 bg-white px-3 py-3 text-sm font-medium text-ocean-800 active:scale-[0.99]"
          >
            <Camera className="h-5 w-5 text-ocean-600" />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-ocean-300 bg-white px-3 py-3 text-sm font-medium text-ocean-800 active:scale-[0.99]"
          >
            <ImagePlus className="h-5 w-5 text-ocean-600" />
            Choose photo
          </button>
        </div>
      )}

      <p className="text-xs text-ocean-600">
        {value.length}/{PHOTO_LIMITS.maxCount} photos · optional
      </p>
      {error && <p className="text-sm text-sargassum-700">{error}</p>}

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
