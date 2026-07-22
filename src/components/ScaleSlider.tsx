"use client";

interface ScaleSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  ariaLabel: string;
  unsetHint: string; // e.g. "Select severity"
}

/**
 * 1–10 slider requiring an explicit selection. Until the user interacts, the
 * value reads as "not set" (shows the hint) rather than defaulting to a number.
 */
export function ScaleSlider({
  value,
  onChange,
  minLabel,
  maxLabel,
  ariaLabel,
  unsetHint,
}: ScaleSliderProps) {
  const isSet = value !== null;
  const displayValue = value ?? 5;

  const commit = (n: number) => onChange(Math.min(10, Math.max(1, n)));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={displayValue}
          aria-label={ariaLabel}
          onPointerDown={() => {
            if (!isSet) commit(displayValue);
          }}
          onKeyDown={() => {
            if (!isSet) commit(displayValue);
          }}
          onChange={(e) => commit(Number(e.target.value))}
          className={`h-3 flex-1 cursor-pointer appearance-none rounded-full accent-ocean-600 ${
            isSet ? "bg-ocean-200" : "bg-ocean-100"
          }`}
        />
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold ${
            isSet
              ? "bg-ocean-600 text-white"
              : "border border-dashed border-ocean-300 text-ocean-400"
          }`}
          aria-live="polite"
        >
          {isSet ? value : "–"}
        </div>
      </div>

      {!isSet && <p className="text-sm font-medium text-sargassum-700">{unsetHint}</p>}

      <div className="flex justify-between gap-4 text-xs text-ocean-700">
        <span className="max-w-[45%]">
          <span className="font-semibold">1</span> — {minLabel}
        </span>
        <span className="max-w-[45%] text-right">
          <span className="font-semibold">10</span> — {maxLabel}
        </span>
      </div>
    </div>
  );
}
