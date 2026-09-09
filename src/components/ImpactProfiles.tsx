"use client";

import { useState } from "react";
import { ChevronRight, Clock, ExternalLink } from "lucide-react";
import { SURVEY_PROFILES, type SurveyProfile } from "@/lib/survey-links";

const CARD_CLASS =
  "flex w-full items-center gap-4 rounded-xl border border-ocean-100 bg-white p-5 text-left shadow-sm transition hover:border-ocean-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2";

function ProfileLabel({ profile }: { profile: SurveyProfile }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-display text-lg font-bold leading-snug text-ocean-900">
        {profile.label}
      </span>
      <span className="mt-1 block text-sm text-ocean-600">{profile.blurb}</span>
    </span>
  );
}

/**
 * Four profile buttons (SPEC-V2 D). Each routes to an external SurveyMonkey
 * survey once its link exists; until then it shows a coming-soon panel rather
 * than linking anywhere.
 */
export function ImpactProfiles() {
  const [pending, setPending] = useState<SurveyProfile | null>(null);

  if (pending) {
    return (
      <div className="rounded-xl border border-ocean-100 bg-white p-6 text-center shadow-sm">
        <Clock className="mx-auto h-12 w-12 text-ocean-400" aria-hidden="true" />
        <h2 className="mt-4 font-display text-xl font-bold text-ocean-900">
          This survey is coming soon
        </h2>
        <p className="mt-2 text-sm text-ocean-600">
          The {pending.label.toLowerCase()} impact survey is being finalised with the
          Ministry. Please check back shortly.
        </p>
        <p className="mt-3 text-sm text-ocean-600">
          In the meantime you can still report a sargassum landing, and note any
          impacts in the comments.
        </p>
        <button
          type="button"
          onClick={() => setPending(null)}
          className="mt-6 w-full rounded-lg bg-ocean-600 px-4 py-3 text-base font-semibold text-white hover:bg-ocean-700"
        >
          Choose a different profile
        </button>
      </div>
    );
  }

  return (
    <nav aria-label="Which best describes you?" className="space-y-4">
      {SURVEY_PROFILES.map((profile) =>
        profile.url ? (
          <a
            key={profile.id}
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className={CARD_CLASS}
          >
            <ProfileLabel profile={profile} />
            <ExternalLink
              className="h-5 w-5 shrink-0 text-ocean-400"
              aria-hidden="true"
            />
          </a>
        ) : (
          <button
            key={profile.id}
            type="button"
            onClick={() => setPending(profile)}
            className={CARD_CLASS}
          >
            <ProfileLabel profile={profile} />
            <ChevronRight
              className="h-5 w-5 shrink-0 text-ocean-400"
              aria-hidden="true"
            />
          </button>
        )
      )}
    </nav>
  );
}
