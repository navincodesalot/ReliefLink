"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";

import {
  SearchableSelect,
  type SearchOption,
} from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DriverListItem, NodeJSON, ShipmentJSON } from "@/lib/types";

type Props = {
  nodes: NodeJSON[];
  drivers: DriverListItem[];
  onCreated: (shipment: ShipmentJSON) => void;
};

function nodeLabel(n: NodeJSON) {
  return `${n.name} (${n.kind})`;
}

type InventoryLine = { item: string; quantity: number; unit?: string };

export function CreateShipmentForm({ nodes, drivers, onCreated }: Props) {
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [description, setDescription] = useState("");
  const [cargo, setCargo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [driverDeviceId, setDriverDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inventoryNeed, setInventoryNeed] = useState<InventoryLine[]>([]);
  const [inventoryWant, setInventoryWant] = useState<InventoryLine[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryPick, setInventoryPick] = useState("");

  const destinationNode = useMemo(
    () => (destination ? nodes.find((n) => n.nodeId === destination) : undefined),
    [nodes, destination],
  );
  const destinationHasInventory = Boolean(destinationNode);

  useEffect(() => {
    setInventoryPick("");
    setInventoryNeed([]);
    setInventoryWant([]);
    if (!destination || !destinationHasInventory) return;

    let cancelled = false;
    setInventoryLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/warehouse/inventory?warehouseNodeId=${encodeURIComponent(destination)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          need?: InventoryLine[];
          want?: InventoryLine[];
          error?: unknown;
        };
        if (!res.ok) throw new Error("Could not load node inventory.");
        if (cancelled) return;
        setInventoryNeed(Array.isArray(data.need) ? data.need : []);
        setInventoryWant(Array.isArray(data.want) ? data.want : []);
      } catch {
        if (!cancelled) {
          setInventoryNeed([]);
          setInventoryWant([]);
          toast.error("Could not load inventory for this destination.");
        }
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destination, destinationHasInventory]);

  const inventoryOptions: SearchOption[] = useMemo(() => {
    const out: SearchOption[] = [];
    inventoryNeed.forEach((line, i) => {
      const unit = line.unit?.trim();
      out.push({
        value: `need:${i}`,
        label: line.item,
        description: `Need · ${line.quantity}${unit ? ` ${unit}` : ""}`,
        keywords: [line.item, "need", "urgent"],
      });
    });
    inventoryWant.forEach((line, i) => {
      const unit = line.unit?.trim();
      out.push({
        value: `want:${i}`,
        label: line.item,
        description: `Want · ${line.quantity}${unit ? ` ${unit}` : ""}`,
        keywords: [line.item, "want", "planned"],
      });
    });
    return out;
  }, [inventoryNeed, inventoryWant]);

  function applyInventoryPick(key: string) {
    setInventoryPick(key);
    if (!key) return;
    const [bucket, idxStr] = key.split(":");
    const idx = Number.parseInt(idxStr ?? "", 10);
    if ((bucket !== "need" && bucket !== "want") || Number.isNaN(idx)) return;
    const line = bucket === "need" ? inventoryNeed[idx] : inventoryWant[idx];
    if (!line) return;
    const unit = line.unit?.trim();
    const qtyLabel =
      line.quantity > 0 ? `${line.quantity}${unit ? ` ${unit}` : ""}` : "";
    setCargo(line.item);
    setDescription(
      bucket === "need"
        ? `Urgent need: ${line.item}${qtyLabel ? ` (${qtyLabel})` : ""}`
        : `Planned intake: ${line.item}${qtyLabel ? ` (${qtyLabel})` : ""}`,
    );
    setQuantity(line.quantity > 0 ? String(line.quantity) : "");
  }

  const originOptions: SearchOption[] = useMemo(
    () =>
      nodes.map((n) => ({
        value: n.nodeId,
        label: nodeLabel(n),
        description: n.nodeId,
        keywords: [n.nodeId, n.kind],
      })),
    [nodes],
  );

  const destinationOptions: SearchOption[] = useMemo(
    () =>
      nodes
        .filter((n) => n.hasHardware && !n.pendingOnboarding)
        .map((n) => ({
          value: n.nodeId,
          label: nodeLabel(n),
          description: n.nodeId,
          keywords: [n.nodeId, n.kind],
        })),
    [nodes],
  );

  const driverOptions: SearchOption[] = drivers.map((d) => ({
    value: d.driverDeviceId,
    label: d.name,
    description: d.driverDeviceId,
    keywords: [d.email, d.driverDeviceId],
  }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!origin || !destination) {
      setError("pick an origin and a destination");
      return;
    }
    if (origin === destination) {
      setError("origin and destination must differ");
      return;
    }

    setBusy(true);
    try {
      const body = {
        originNodeId: origin,
        finalDestinationNodeId: destination,
        description: description.trim() || undefined,
        cargo: cargo.trim() || undefined,
        quantity: quantity.trim() ? Number(quantity) : undefined,
        driverDeviceId: driverDeviceId.trim() || undefined,
      };
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        shipment?: ShipmentJSON;
      };
      if (!res.ok || !data.shipment) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(`Shipment ${data.shipment.shipmentId} dispatched.`);
      onCreated(data.shipment);
      setDescription("");
      setCargo("");
      setQuantity("");
      setInventoryPick("");
      setDriverDeviceId("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackagePlus className="h-4 w-4" /> Create shipment
        </CardTitle>
        <CardDescription>
          Relief jobs from origin to destination. Destinations need an assigned device
          (real or simulated via the tap button).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>From (origin)</Label>
            <SearchableSelect
              options={originOptions}
              value={origin}
              onChange={setOrigin}
              placeholder="Select origin…"
              searchPlaceholder="Search nodes…"
              emptyMessage="No matching nodes."
              clearable
            />
          </div>
          <div className="space-y-1.5">
            <Label>To (final destination)</Label>
            <SearchableSelect
              options={destinationOptions}
              value={destination}
              onChange={setDestination}
              placeholder="Select destination…"
              searchPlaceholder="Search nodes…"
              emptyMessage="No matching nodes."
              clearable
            />
          </div>

          {destinationHasInventory ? (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="ship-inv-pick">Goods from destination inventory</Label>
              <SearchableSelect
                id="ship-inv-pick"
                options={inventoryOptions}
                value={inventoryPick}
                onChange={applyInventoryPick}
                disabled={inventoryLoading || inventoryOptions.length === 0}
                placeholder={
                  inventoryLoading
                    ? "Loading inventory…"
                    : inventoryOptions.length === 0
                      ? "No need/want lines saved for this node yet"
                      : "Search items from need & want lists…"
                }
                searchPlaceholder="Search items…"
                emptyMessage="No matching inventory lines."
                clearable
              />
              <p className="text-xs text-muted-foreground">
                Uses this node&apos;s saved{" "}
                <span className="font-medium">Need</span> and{" "}
                <span className="font-medium">Want</span> lists. Choosing a row fills
                description, cargo, and quantity; you can edit them afterward.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ship-desc">Description</Label>
            <Input
              id="ship-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Emergency MRE drop"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ship-cargo">Cargo</Label>
            <Input
              id="ship-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="MRE kits"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ship-qty">Quantity</Label>
            <Input
              id="ship-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="500"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Driver (optional)</Label>
            <SearchableSelect
              options={driverOptions}
              value={driverDeviceId}
              onChange={setDriverDeviceId}
              placeholder={
                drivers.length === 0
                  ? "No drivers registered yet…"
                  : "Search drivers by name or device id…"
              }
              searchPlaceholder="Search drivers…"
              emptyMessage="No matching drivers."
              clearable
            />
            <p className="text-xs text-muted-foreground">
              Applied to every leg; override per-leg later from the shipments table.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Dispatching..." : "Dispatch shipment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
