"use client";

import { cn } from "@/lib/utils";

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

interface ChoiceGroupProps {
  name: string;
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  ariaLabel: string;
}

/**
 * Single-select list rendered as tappable cards (SPEC-V2 C1/C3). Native radios
 * are kept for keyboard and screen-reader behaviour; the card is the label.
 */
export function ChoiceGroup({ name, options, value, onChange, ariaLabel }: ChoiceGroupProps) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
              selected
                ? "border-ocean-600 bg-ocean-50 ring-1 ring-ocean-600"
                : "border-ocean-200 hover:border-ocean-400"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-ocean-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ocean-900">
                {option.label}
              </span>
              {option.hint && (
                <span className="mt-0.5 block text-xs text-ocean-600">{option.hint}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
