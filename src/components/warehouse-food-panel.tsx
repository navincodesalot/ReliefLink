"use client";

import { useCallback, useEffect, useState } from "react";
import { Apple } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unitOptionsForLine } from "@/lib/inventory-units";
import { cn } from "@/lib/utils";

type Line = { item: string; quantity: number; unit?: string };

function emptyLine(): Line {
  return { item: "", quantity: 0, unit: "kg" };
}

export function WarehouseFoodPanel({
  warehouseNodeId,
  onSaved,
}: {
  warehouseNodeId: string;
  onSaved?: () => void;
}) {
  const [need, setNeed] = useState<Line[]>([emptyLine()]);
  const [want, setWant] = useState<Line[]>([emptyLine()]);
  const [have, setHave] = useState<Line[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!warehouseNodeId) return;
    const res = await fetch(
      `/api/warehouse/inventory?warehouseNodeId=${encodeURIComponent(warehouseNodeId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const d = (await res.json()) as {
      need?: Line[];
      want?: Line[];
      have?: Line[];
    };
    setNeed(d.need?.length ? d.need : [emptyLine()]);
    setWant(d.want?.length ? d.want : [emptyLine()]);
    setHave(d.have?.length ? d.have : [emptyLine()]);
  }, [warehouseNodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function clean(lines: Line[]): Line[] {
    return lines
      .filter((l) => l.item.trim().length > 0)
      .map((l) => ({
        item: l.item.trim(),
        quantity: Math.max(0, Number(l.quantity) || 0),
        unit: l.unit?.trim() || undefined,
      }));
  }

  async function save() {
    if (!warehouseNodeId) {
      toast.error("Pick a site first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/warehouse/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseNodeId,
          need: clean(need),
          want: clean(want),
          have: clean(have),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success("Inventory saved.");
      void load();
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Apple className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Edit inventory</CardTitle>
        </div>
        <CardDescription>
          Add or change lines below, then save. The snapshot above refreshes after a successful
          save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LineEditor title="Need (urgent)" lines={need} setLines={setNeed} />
        <LineEditor title="Want (planned)" lines={want} setLines={setWant} />
        <LineEditor title="Have (inventory)" lines={have} setLines={setHave} />
        <Button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save inventory"}
        </Button>
      </CardContent>
    </Card>
  );
}

function LineEditor({
  title,
  lines,
  setLines,
}: {
  title: string;
  lines: Line[];
  setLines: React.Dispatch<React.SetStateAction<Line[]>>;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <Input
              placeholder="Item"
              value={line.item}
              onChange={(e) =>
                setLines((prev) => {
                  const n = [...prev];
                  const cur = n[i]!;
                  n[i] = { item: e.target.value, quantity: cur.quantity, unit: cur.unit };
                  return n;
                })
              }
              className="min-w-[140px] flex-1"
            />
            <Input
              type="number"
              placeholder="Qty"
              value={line.quantity || ""}
              onChange={(e) =>
                setLines((prev) => {
                  const n = [...prev];
                  const cur = n[i]!;
                  n[i] = {
                    item: cur.item,
                    quantity: Number(e.target.value),
                    unit: cur.unit,
                  };
                  return n;
                })
              }
              className="w-24"
            />
            <select
              aria-label="Unit"
              value={line.unit ?? "kg"}
              onChange={(e) =>
                setLines((prev) => {
                  const n = [...prev];
                  const cur = n[i]!;
                  n[i] = {
                    item: cur.item,
                    quantity: cur.quantity,
                    unit: e.target.value,
                  };
                  return n;
                })
              }
              className={cn(
                "h-9 min-w-26 shrink-0 rounded-md border border-input bg-transparent px-2 text-sm text-foreground shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              {unitOptionsForLine(line.unit).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLines((prev) => [...prev, emptyLine()])}
      >
        Add line
      </Button>
    </div>
  );
}
