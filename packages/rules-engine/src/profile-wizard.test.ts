import { describe, expect, it } from "vitest";
import { isProfileWizardComplete, profileWizardPatch } from "./profile-wizard";

describe("profileWizardPatch", () => {
  it("stores suitability_tier as null for later DT-SUIT-01", () => {
    const patch = profileWizardPatch({
      display_name: "  Ada  ",
      experience_level: "intermediate",
      objectives: "  learn paper trading  ",
    });
    expect(patch.display_name).toBe("Ada");
    expect(patch.suitability_tier).toBeNull();
    expect(patch.objectives).toBe("learn paper trading");
  });
});

describe("isProfileWizardComplete", () => {
  it("requires display name and experience level", () => {
    expect(isProfileWizardComplete(null)).toBe(false);
    expect(isProfileWizardComplete({ display_name: "Ada", experience_level: null })).toBe(false);
    expect(isProfileWizardComplete({ display_name: "Ada", experience_level: "novice" })).toBe(true);
  });
});
