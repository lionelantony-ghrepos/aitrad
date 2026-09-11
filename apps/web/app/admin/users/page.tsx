import { redirect } from "next/navigation";
import { authorizeUser } from "@/lib/auth/authorize-user";
import { UsersAdminConsole } from "@/components/admin/users-admin-console";
import { loadAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage(): Promise<React.JSX.Element> {
  const ctx = await loadAuthContext();
  if (!ctx) {
    redirect("/login?next=/admin/users");
  }
  if (!ctx.wizardComplete) {
    redirect("/onboarding");
  }
  const gate = await authorizeUser({
    userId: ctx.user.id,
    action: "users:read",
    token: ctx.accessToken,
  });
  if (!gate.allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-destructive" data-testid="users-denied">
          403 — user admin requires an entitled role.
        </p>
      </main>
    );
  }
  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
          Meridian · Users
        </p>
        <div className="flex gap-3">
          <a href="/admin/rules" className="text-[11px] text-accent">
            Rules
          </a>
          <a href="/workspace" className="text-[11px] text-accent">
            Back to workspace
          </a>
        </div>
      </header>
      <UsersAdminConsole />
    </main>
  );
}
