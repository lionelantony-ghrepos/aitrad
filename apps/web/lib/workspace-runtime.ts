"use client";

import type { DockviewApi } from "dockview-react";
import { createContext, useContext } from "react";

export type WorkspaceRuntimeValue = {
  e2eFeed: boolean;
  userId: string | null;
  dockApi: DockviewApi | null;
};

export const WorkspaceRuntimeContext = createContext<WorkspaceRuntimeValue>({
  e2eFeed: false,
  userId: null,
  dockApi: null,
});

export function useWorkspaceRuntime(): WorkspaceRuntimeValue {
  return useContext(WorkspaceRuntimeContext);
}
