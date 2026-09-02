import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions/auth";
import { AuthFrame } from "@/components/auth/auth-frame";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { loadAuthContext } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const ctx = await loadAuthContext();
  if (ctx) {
    redirect(ctx.wizardComplete ? "/workspace" : "/onboarding");
  }
  const params = await searchParams;
  return (
    <AuthFrame title="Sign in">
      {params.error ? (
        <p className="mb-3 text-xs text-destructive" role="alert">
          OAuth sign-in failed. Use email or try Google again.
        </p>
      ) : null}
      <CredentialsForm
        action={signInAction}
        submitLabel="Sign in"
        nextPath={params.next}
        altHref="/signup"
        altLabel="Create an account"
      />
    </AuthFrame>
  );
}
