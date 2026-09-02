import { workspaceLayoutV1Schema, type WorkspaceLayoutV1 } from "@meridian/schemas";

export const LAYOUT_STORAGE_KEY = "meridian.workspace.layout.v1";

export function loadStoredLayout(storage: Storage): WorkspaceLayoutV1 | null {
  const raw = storage.getItem(LAYOUT_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = workspaceLayoutV1Schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveStoredLayout(storage: Storage, layout: WorkspaceLayoutV1): void {
  storage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export function clearStoredLayout(storage: Storage): void {
  storage.removeItem(LAYOUT_STORAGE_KEY);
}
