import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { formatPaperCash } from "@/lib/format-cash";
import { isAuthStub } from "@/lib/auth/mode";
import { loadAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function WorkspacePage(): Promise<React.JSX.Element> {
  const ctx = await loadAuthContext();
  if (!ctx) {
    redirect("/login?next=/workspace");
  }
  if (!ctx.wizardComplete) {
    redirect("/onboarding");
  }
  const cashLabel =
    ctx.account !== null ? formatPaperCash(ctx.account.cash_balance, ctx.account.currency) : null;
  return (
    <WorkspaceShell
      email={ctx.user.email}
      cashLabel={cashLabel}
      accountCount={ctx.account ? 1 : 0}
      e2eFeed={isAuthStub()}
    />
  );
}
