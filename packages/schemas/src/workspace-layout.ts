import { z } from "zod";

/** Versioned localStorage payload for the terminal dock layout (PBI-003). */
export const workspaceLayoutV1Schema = z.object({
  version: z.literal(1),
  dockview: z.record(z.unknown()),
});

export type WorkspaceLayoutV1 = z.infer<typeof workspaceLayoutV1Schema>;
