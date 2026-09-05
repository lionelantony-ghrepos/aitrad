import type { Page } from "@playwright/test";
import type { RulesAdminRole } from "@meridian/schemas";

export async function setStubPersona(page: Page, persona: RulesAdminRole): Promise<void> {
  const result = await page.evaluate(async (role) => {
    const response = await fetch("/api/e2e/persona", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: role }),
    });
    return { ok: response.ok, status: response.status };
  }, persona);
  if (!result.ok) {
    throw new Error(`PERSONA_${result.status}`);
  }
}
