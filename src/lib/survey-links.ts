/**
 * Impact survey links (SPEC-V2 D).
 *
 * The Ministry's SurveyMonkey URLs do not exist yet. Leave `url` as null and a
 * friendly "coming soon" screen is shown instead; paste the real link in and the
 * profile starts routing out immediately. Nothing else needs to change.
 *
 * Do not ship placeholder/example URLs — a null here is deliberate.
 */
export interface SurveyProfile {
  id: string;
  label: string;
  blurb: string;
  /** SurveyMonkey URL, or null while the link is still pending. */
  url: string | null;
}

export const SURVEY_PROFILES: SurveyProfile[] = [
  {
    id: "resident",
    label: "Resident",
    blurb: "You live in the Virgin Islands.",
    url: null,
  },
  {
    id: "tourist",
    label: "Tourist",
    blurb: "You are visiting the Territory.",
    url: null,
  },
  {
    id: "tourism-operator",
    label: "Tourism Operator",
    blurb: "You run a hotel, charter, dive, or excursion business.",
    url: null,
  },
  {
    id: "fisherfolk",
    label: "Fisherfolk",
    blurb: "You fish commercially or recreationally.",
    url: null,
  },
];

export function getSurveyProfile(id: string): SurveyProfile | undefined {
  return SURVEY_PROFILES.find((profile) => profile.id === id);
}
