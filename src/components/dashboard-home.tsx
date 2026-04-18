"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { BatchTable } from "@/components/batch-table";
import { CreateBatchForm } from "@/components/create-batch-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Batch } from "@/lib/types";

export function DashboardHome() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/batches", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { batches: Batch[] };
      setBatches(data.batches);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  const flaggedCount = batches.filter((b) => b.isFlagged).length;
  const inTransitCount = batches.filter(
    (b) => b.status === "in_transit" || b.status === "created",
  ).length;
  const deliveredCount = batches.filter((b) => b.status === "delivered").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-10">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">FoodTrust</h1>
            <p className="text-sm text-muted-foreground">
              Verified chain of custody for disaster food aid. Every handoff is
              physically confirmed on a Raspberry Pi and anchored on Solana
              testnet.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> refresh
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="In transit" value={inTransitCount} />
        <Stat label="Delivered" value={deliveredCount} />
        <Stat label="Flagged" value={flaggedCount} tone="danger" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>New batch</CardTitle>
          <CardDescription>
            Register a fresh shipment at the warehouse. The origin becomes the
            initial custodian.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateBatchForm onCreated={load} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>
            {loading && batches.length === 0
              ? "Loading…"
              : lastSync
                ? `Live — last synced ${lastSync.toLocaleTimeString()}`
                : null}
            {error ? (
              <span className="ml-2 text-destructive">· {error}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BatchTable batches={batches} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={`text-3xl font-semibold tabular-nums ${
            tone === "danger" && value > 0 ? "text-destructive" : ""
          }`}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}
