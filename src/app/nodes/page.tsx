import Link from "next/link";

import { WarehouseFoodWorkspace } from "@/components/warehouse-food-workspace";

/** Node-operator portal: inventory & late alerts per site (not the UN admin console). */
export default function NodesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-950/10 via-background to-background dark:from-emerald-950/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_80%_-15%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(ellipse_70%_40%_at_80%_-15%,rgba(16,185,129,0.22),transparent)]" />
      <div className="relative mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            Network nodes
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Sites & inventory
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Choose a warehouse, store, or other node to edit need / want / have lists and watch
            for late inbound legs. Full network operations and the live map are on the{" "}
            <Link href="/admin" className="font-medium text-foreground underline-offset-4 hover:underline">
              Administrator console
            </Link>
            .
          </p>
        </header>
        <WarehouseFoodWorkspace />
      </div>
    </div>
  );
}
