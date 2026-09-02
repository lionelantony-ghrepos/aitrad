import type { ReactNode } from "react";

export function AuthFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md border border-border bg-card p-6">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Meridian</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}
