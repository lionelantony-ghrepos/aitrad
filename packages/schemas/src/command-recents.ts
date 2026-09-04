import { z } from "zod";

/** Versioned localStorage payload for command-palette recents (PBI-009). */
export const commandRecentsV1Schema = z.object({
  version: z.literal(1),
  items: z.array(z.string().min(1)).max(20),
});

export type CommandRecentsV1 = z.infer<typeof commandRecentsV1Schema>;
