"use client";

import { createContext, useContext } from "react";

export const WorkspaceRuntimeContext = createContext({ e2eFeed: false });

export function useWorkspaceRuntime(): { e2eFeed: boolean } {
  return useContext(WorkspaceRuntimeContext);
}
