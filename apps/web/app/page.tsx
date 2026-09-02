import Link from "next/link";
import { Button } from "@/components/ui/button";
import { scaffoldStatus } from "@/lib/scaffold";

export default function Home(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-start justify-center gap-4 bg-background px-8 text-foreground">
      <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Meridian</p>
      <h1 className="text-3xl font-semibold tracking-tight">Paper trading terminal</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        US equities and ETFs. Simulated fills only. Open the workspace to dock placeholder panels.
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="default">
          <Link href="/workspace">Open workspace</Link>
        </Button>
        <Button type="button" variant="outline">
          {scaffoldStatus()}
        </Button>
      </div>
    </main>
  );
}
