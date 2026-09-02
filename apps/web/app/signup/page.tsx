import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions/auth";
import { AuthFrame } from "@/components/auth/auth-frame";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { loadAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SignupPage(): Promise<React.JSX.Element> {
  const ctx = await loadAuthContext();
  if (ctx) {
    redirect(ctx.wizardComplete ? "/workspace" : "/onboarding");
  }
  return (
    <AuthFrame title="Create account">
      <CredentialsForm
        action={signUpAction}
        submitLabel="Sign up"
        altHref="/login"
        altLabel="Already have an account? Sign in"
      />
    </AuthFrame>
  );
}
