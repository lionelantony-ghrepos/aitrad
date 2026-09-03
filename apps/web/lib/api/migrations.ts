export const LOCAL_MIGRATION_IDS = ["0001", "0002", "0003"] as const;

export function planMigrationApply(
  applied: readonly string[],
  local: readonly string[] = LOCAL_MIGRATION_IDS,
): { toApply: string[]; skipped: string[] } {
  const appliedSet = new Set(applied);
  const toApply = local.filter((id) => !appliedSet.has(id));
  const skipped = local.filter((id) => appliedSet.has(id));
  return { toApply, skipped };
}
