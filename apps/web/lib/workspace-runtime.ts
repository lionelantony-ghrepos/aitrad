"use client";

import type { DockviewApi } from "dockview-react";
import { createContext, useContext } from "react";

export type WorkspaceRuntimeValue = {
  e2eFeed: boolean;
  dockApi: DockviewApi | null;
};

export const WorkspaceRuntimeContext = createContext<WorkspaceRuntimeValue>({
  e2eFeed: false,
  dockApi: null,
});

export function useWorkspaceRuntime(): WorkspaceRuntimeValue {
  return useContext(WorkspaceRuntimeContext);
}
