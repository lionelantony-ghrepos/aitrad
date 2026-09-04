import { commandRecentsV1Schema } from "@meridian/schemas";

export const COMMAND_RECENTS_KEY = "meridian.command.recents.v1";
const MAX_RECENTS = 10;

export function loadCommandRecents(storage: Storage): string[] {
  const raw = storage.getItem(COMMAND_RECENTS_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = commandRecentsV1Schema.safeParse(parsed);
    return result.success ? result.data.items : [];
  } catch {
    return [];
  }
}

export function pushCommandRecent(storage: Storage, command: string): string[] {
  const next = [command, ...loadCommandRecents(storage).filter((item) => item !== command)].slice(
    0,
    MAX_RECENTS,
  );
  storage.setItem(COMMAND_RECENTS_KEY, JSON.stringify({ version: 1, items: next }));
  return next;
}
