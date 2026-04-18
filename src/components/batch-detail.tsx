"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { TransferTimeline } from "@/components/transfer-timeline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Batch, TransferEvent } from "@/lib/types";

type Props = {
  batchId: string;
};

export function BatchDetail({ batchId }: Props) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [events, setEvents] = useState<TransferEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/batch/${encodeURIComponent(batchId)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setBatch(null);
        setEvents([]);
        setError("batch not found");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        batch: Batch;
        events: TransferEvent[];
      };
      setBatch(data.batch);
      setEvents(data.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All batches
        </Link>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> refresh
        </Button>
      </div>

      {loading && !batch ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !batch ? (
        <p className="text-sm text-destructive">{error ?? "batch not found"}</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{batch.batchId}</CardTitle>
                  <CardDescription>
                    {batch.origin} → {batch.intendedDestination}
                  </CardDescription>
                </div>
                <StatusBadge status={batch.status} isFlagged={batch.isFlagged} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <Field label="Current holder" value={batch.currentHolder} />
              <Field label="Transfers" value={String(batch.totalTransfers)} />
              <Field
                label="Created"
                value={new Date(batch.createdAt).toLocaleString()}
              />
              <Field
                label="Last updated"
                value={new Date(batch.lastUpdated).toLocaleString()}
              />
              {batch.solanaExplorerUrl ? (
                <div className="md:col-span-4">
                  <Separator className="my-2" />
                  <a
                    href={batch.solanaExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Latest chain anchor on Solana testnet
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Every physical handoff recorded by a Raspberry Pi button press.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransferTimeline events={events} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}
