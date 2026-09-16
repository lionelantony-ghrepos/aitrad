import { workspaceDemoFixtureSchema, type WorkspaceDemoFixture } from "@meridian/schemas";

export type { WorkspaceDemoFixture };

export function parseWorkspaceFixturesJson(raw: unknown): WorkspaceDemoFixture {
  return workspaceDemoFixtureSchema.parse(raw);
}
