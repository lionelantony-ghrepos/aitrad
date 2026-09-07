import { z } from "zod";
import { uuidSchema } from "./primitives";

/** Versioned localStorage payload for the terminal dock layout (PBI-003/007). */
export const workspaceLayoutV1Schema = z.object({
  version: z.literal(1),
  dockview: z.record(z.unknown()),
  selectedWatchlistId: uuidSchema.nullable().optional(),
});

export type WorkspaceLayoutV1 = z.infer<typeof workspaceLayoutV1Schema>;
