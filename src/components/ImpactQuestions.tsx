"use client";

import { HEALTH_DRAFT_NOTE, IMPACT_CATEGORIES, IMPACT_LIMITS } from "@/lib/constants";
import type { ImpactAnswer, ImpactAnswers } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ImpactQuestionsProps {
  value: ImpactAnswers;
  onChange: (next: ImpactAnswers) => void;
}

/** Drop a category once it holds no answers, so `impacts` never stores empty shells. */
function withAnswer(
  answers: ImpactAnswers,
  key: keyof ImpactAnswers,
  answer: ImpactAnswer
): ImpactAnswers {
  const next = { ...answers };
  const hasSelections = (answer.selections?.length ?? 0) > 0;
  const hasOther = (answer.other ?? "").trim() !== "";
  if (!hasSelections && !hasOther) delete next[key];
  else next[key] = answer;
  return next;
}

/**
 * The optional impact section of a landing report (SPEC-V2 C6): five checkbox
 * groups, each with a free-text "other". Ticking "None" clears the rest of its
 * group and vice versa, so a category can't say both.
 */
export function ImpactQuestions({ value, onChange }: ImpactQuestionsProps) {
  const toggle = (key: keyof ImpactAnswers, option: string) => {
    const current = value[key]?.selections ?? [];
    let selections: string[];
    if (current.includes(option)) {
      selections = current.filter((s) => s !== option);
    } else if (option === "none") {
      selections = ["none"];
    } else {
      selections = [...current.filter((s) => s !== "none"), option];
    }
    onChange(withAnswer(value, key, { ...value[key], selections }));
  };

  const setOther = (key: keyof ImpactAnswers, other: string) => {
    onChange(
      withAnswer(value, key, {
        ...value[key],
        other: other.slice(0, IMPACT_LIMITS.otherMaxChars),
      })
    );
  };

  return (
    <div className="space-y-6">
      {IMPACT_CATEGORIES.map((category) => {
        const answer = value[category.key];
        const selections = answer?.selections ?? [];
        return (
          <fieldset key={category.key}>
            <legend className="mb-2 text-sm font-semibold text-ocean-800">
              {category.label}
            </legend>

            {"draft" in category && category.draft && (
              <p className="mb-2 inline-block rounded bg-sargassum-50 px-2 py-1 text-xs font-medium text-sargassum-800">
                {HEALTH_DRAFT_NOTE}
              </p>
            )}

            <div className="space-y-2">
              {category.options.map((option) => {
                const checked = selections.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition",
                      checked
                        ? "border-ocean-600 bg-ocean-50 ring-1 ring-ocean-600"
                        : "border-ocean-200 hover:border-ocean-400"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(category.key, option.value)}
                      className="h-5 w-5 shrink-0 accent-ocean-600"
                    />
                    <span className="text-sm font-medium text-ocean-900">{option.label}</span>
                  </label>
                );
              })}
            </div>

            <input
              type="text"
              value={answer?.other ?? ""}
              onChange={(e) => setOther(category.key, e.target.value)}
              placeholder="Other (please describe)"
              aria-label={`Other ${category.label.toLowerCase()} impact`}
              className="mt-2 w-full rounded-lg border border-ocean-300 p-3 text-base text-ocean-900 placeholder:text-ocean-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200"
            />
          </fieldset>
        );
      })}
    </div>
  );
}
