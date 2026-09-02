import { redirect } from "next/navigation";
import { completeWizardAction } from "@/app/actions/auth";
import { AuthFrame } from "@/components/auth/auth-frame";
import { WizardForm } from "@/components/auth/wizard-form";
import { loadAuthContext } from "@/lib/auth/session";

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const ctx = await loadAuthContext();
  if (!ctx) {
    redirect("/login?next=/onboarding");
  }
  if (ctx.wizardComplete) {
    redirect("/workspace");
  }
  return (
    <AuthFrame title="Profile setup">
      <p className="mb-3 text-xs text-muted-foreground">
        Experience level is stored for later suitability rules. The tier itself is not computed
        here.
      </p>
      <WizardForm action={completeWizardAction} />
    </AuthFrame>
  );
}
