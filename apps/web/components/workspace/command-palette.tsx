"use client";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-24"
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-labelledby="palette-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-border bg-card p-3 shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <p id="palette-title" className="font-mono text-xs tracking-wide text-primary uppercase">
          Command palette
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Placeholder — function commands ship in a later PBI. Esc to close.
        </p>
        <input
          autoFocus
          className="mt-2 w-full border border-input bg-background px-2 py-1 font-mono text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Type a command…"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
            }
          }}
        />
      </div>
    </div>
  );
}
