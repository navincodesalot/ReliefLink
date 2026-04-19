"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ShipmentJSON } from "@/lib/types";

export function PublicChainView() {
  const [shipments, setShipments] = useState<ShipmentJSON[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/shipments", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { shipments: ShipmentJSON[] };
      setShipments(d.shipments);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-950/20 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.18),transparent)]" />
      <div className="relative mx-auto max-w-5xl space-y-8 px-4 py-12 md:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Public transparency
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Solana chain of custody
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Every verified handoff is anchored on Solana testnet. Below are shipments with
              on-chain memo signatures you can verify independently—no sign-in required.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/">← Home</Link>
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {shipments.length === 0 && !error ? (
            <p className="text-sm text-muted-foreground">Loading public ledger…</p>
          ) : null}
          {shipments.map((s) => (
            <Card
              key={s.shipmentId}
              className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
            >
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-lg font-mono">{s.shipmentId}</CardTitle>
                </div>
                <CardDescription>
                  {s.description ?? s.cargo ?? "Aid shipment"} · {s.status.replace("_", " ")} ·{" "}
                  {s.completedLegs}/{s.totalLegs} legs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.solanaSignatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No on-chain signatures recorded yet for this shipment.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {s.solanaSignatures.map((sig, i) => (
                      <li
                        key={`${sig}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          Tx {i + 1}
                        </span>
                        <a
                          href={`https://explorer.solana.com/tx/${sig}?cluster=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                        >
                          {sig.slice(0, 10)}…{sig.slice(-8)}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {s.latestSolanaExplorerUrl ? (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={s.latestSolanaExplorerUrl} target="_blank" rel="noopener noreferrer">
                      Open latest transaction
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
