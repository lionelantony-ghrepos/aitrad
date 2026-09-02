"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthActionResult } from "@/app/actions/auth";

type WizardFormProps = {
  action: (formData: FormData) => Promise<AuthActionResult>;
};

export function WizardForm({ action }: WizardFormProps): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      data-testid="wizard-form"
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
      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        Display name
        <input
          className="h-9 border border-input bg-background px-2 text-sm text-foreground"
          name="display_name"
          required
          data-testid="display-name"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        Experience
        <select
          className="h-9 border border-input bg-background px-2 text-sm text-foreground"
          name="experience_level"
          required
          defaultValue="intermediate"
          data-testid="experience-level"
        >
          <option value="novice">Novice</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        Objectives
        <textarea
          className="min-h-20 border border-input bg-background px-2 py-1 text-sm text-foreground"
          name="objectives"
          data-testid="objectives"
        />
      </label>
      {message ? (
        <p className="text-xs text-destructive" data-testid="wizard-error" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} data-testid="wizard-submit">
        {pending ? "Saving…" : "Enter workspace"}
      </Button>
    </form>
  );
}
