import { Button } from "@/components/ui/button";
import { scaffoldStatus } from "@/lib/scaffold";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-center gap-4 bg-background px-8 text-foreground">
      <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Meridian</p>
      <h1 className="text-3xl font-semibold tracking-tight">Paper trading terminal</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        US equities and ETFs. Simulated fills only. Workspace panels land in later PBIs.
      </p>
      <Button type="button" variant="default">
        {scaffoldStatus()}
      </Button>
    </main>
  );
}
