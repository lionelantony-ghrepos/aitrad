"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { startGoogleOAuthAction, type AuthActionResult } from "@/app/actions/auth";

type CredentialsFormProps = {
  action: (formData: FormData) => Promise<AuthActionResult>;
  submitLabel: string;
  nextPath?: string;
  altHref: string;
  altLabel: string;
};

export function CredentialsForm({
  action,
  submitLabel,
  nextPath,
  altHref,
  altLabel,
}: CredentialsFormProps): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-3"
        data-testid="credentials-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setMessage(null);
          const result = await action(new FormData(event.currentTarget));
          if (result && !result.ok) {
            setMessage(result.message);
            setPending(false);
          }
        }}
      >
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Email
          <input
            className="h-9 border border-input bg-background px-2 font-mono text-sm text-foreground"
            name="email"
            type="email"
            autoComplete="email"
            required
            data-testid="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Password
          <input
            className="h-9 border border-input bg-background px-2 font-mono text-sm text-foreground"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password"
          />
        </label>
        {message ? (
          <p className="text-xs text-destructive" data-testid="auth-error" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} data-testid="auth-submit">
          {pending ? "Working…" : submitLabel}
        </Button>
      </form>
      <form action={startGoogleOAuthAction}>
        <Button type="submit" variant="outline" className="w-full" data-testid="oauth-google">
          Continue with Google
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground">
        <Link href={altHref} className="text-accent underline-offset-2 hover:underline">
          {altLabel}
        </Link>
      </p>
    </div>
  );
}
