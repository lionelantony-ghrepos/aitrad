export type WizardFields = {
  display_name: string;
  experience_level: "novice" | "intermediate" | "advanced";
  objectives?: string;
};

export function profileWizardPatch(input: WizardFields): {
  display_name: string;
  experience_level: WizardFields["experience_level"];
  objectives: string | null;
  suitability_tier: null;
} {
  const objectives = input.objectives?.trim() ?? "";
  return {
    display_name: input.display_name.trim(),
    experience_level: input.experience_level,
    objectives: objectives.length === 0 ? null : objectives,
    suitability_tier: null,
  };
}

export function isProfileWizardComplete(
  profile: {
    display_name: string | null;
    experience_level: string | null;
  } | null,
): boolean {
  if (!profile) {
    return false;
  }
  return Boolean(profile.display_name?.trim() && profile.experience_level);
}
