import { redirect } from "next/navigation";
import { baselineTable, entitlementAllows, evaluate } from "@meridian/rules-engine";
import { RulesAdminConsole } from "@/components/admin/rules-admin-console";
import { loadAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function RulesAdminPage(): Promise<React.JSX.Element> {
  const ctx = await loadAuthContext();
  if (!ctx) {
    redirect("/login?next=/admin/rules");
  }
  if (!ctx.wizardComplete) {
    redirect("/onboarding");
  }
  const verdict = evaluate(
    baselineTable("DT-ENT-01"),
    { role: ctx.role, action: "rules:read" },
    new Date(),
  );
  if (!entitlementAllows(verdict.outcome)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-destructive" data-testid="rules-denied">
          403 — rules admin requires an entitled role.
        </p>
      </main>
    );
  }
  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
          Meridian · Rules
        </p>
        <a href="/workspace" className="text-[11px] text-accent">
          Back to workspace
        </a>
      </header>
      <RulesAdminConsole />
    </main>
  );
}
