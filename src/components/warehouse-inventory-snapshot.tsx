"use client";

import { useCallback, useEffect, useState } from "react";
import { Database } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Line = { item: string; quantity: number; unit?: string };

type Snapshot = {
  need: Line[];
  want: Line[];
  have: Line[];
  updatedAt: string | null;
};

const empty: Snapshot = { need: [], want: [], have: [], updatedAt: null };

export function WarehouseInventorySnapshot({
  version,
  warehouseNodeId,
}: {
  version: number;
  warehouseNodeId: string;
}) {
  const [data, setData] = useState<Snapshot>(empty);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!warehouseNodeId) return;
    try {
      const res = await fetch(
        `/api/warehouse/inventory?warehouseNodeId=${encodeURIComponent(warehouseNodeId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const d = (await res.json()) as Snapshot;
      setData({
        need: d.need ?? [],
        want: d.want ?? [],
        have: d.have ?? [],
        updatedAt: d.updatedAt ?? null,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }, [warehouseNodeId]);

  useEffect(() => {
    void load();
  }, [load, version]);

  return (
    <Card className="border-border/80 bg-muted/20 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Saved in MongoDB</CardTitle>
          </div>
          {data.updatedAt ? (
            <span className="text-xs text-muted-foreground">
              Last updated {new Date(data.updatedAt).toLocaleString()}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not saved yet</span>
          )}
        </div>
        <CardDescription>
          What is currently stored for your warehouse account (read-only view).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <SnapshotColumn title="Need (urgent)" lines={data.need} />
        <SnapshotColumn title="Want (planned)" lines={data.want} />
        <SnapshotColumn title="Have (inventory)" lines={data.have} />
        {error ? (
          <p className="text-sm text-destructive md:col-span-3">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SnapshotColumn({ title, lines }: { title: string; lines: Line[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-border/80 bg-card/50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1.5 last:border-0">
              <span className="font-medium text-foreground">{l.item}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {l.quantity}
                {l.unit ? ` ${l.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
