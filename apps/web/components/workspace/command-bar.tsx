"use client";

import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";

type CommandBarProps = {
  onResetLayout: () => void;
  onOpenPalette: () => void;
  email: string;
  cashLabel: string | null;
};

export function CommandBar({
  onResetLayout,
  onOpenPalette,
  email,
  cashLabel,
}: CommandBarProps): React.JSX.Element {
  return (
    <header
      className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2"
      data-testid="command-bar"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
          Meridian
        </span>
        <span className="text-[11px] text-muted-foreground">Workspace</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px]"
          data-testid="open-palette"
          onClick={onOpenPalette}
        >
          Ctrl+K
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          data-testid="reset-layout"
          onClick={onResetLayout}
        >
          Reset layout
        </Button>
        <UserMenu email={email} cashLabel={cashLabel} />
      </div>
    </header>
  );
}
