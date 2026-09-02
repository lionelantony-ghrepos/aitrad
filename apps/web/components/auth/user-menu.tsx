"use client";

import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type UserMenuProps = {
  email: string;
  cashLabel: string | null;
};

export function UserMenu({ email, cashLabel }: UserMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-testid="user-menu">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 max-w-[14rem] truncate px-2 text-[11px]"
        data-testid="user-menu-trigger"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {email}
      </Button>
      {open ? (
        <div className="absolute top-7 right-0 z-20 min-w-[12rem] border border-border bg-popover p-2 shadow-sm">
          {cashLabel ? (
            <p className="tabular-nums text-[11px] text-muted-foreground" data-testid="paper-cash">
              {cashLabel}
            </p>
          ) : null}
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="mt-2 h-6 w-full text-[11px]"
              data-testid="logout"
            >
              Log out
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
