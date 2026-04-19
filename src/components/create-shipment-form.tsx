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
import type { NodeJSON, ShipmentJSON } from "@/lib/types";

type DriverRow = {
  driverDeviceId: string;
  name: string;
  email: string;
};

type Props = {
  nodes: NodeJSON[];
  onCreated: (shipment: ShipmentJSON) => void;
};

function nodeLabel(n: NodeJSON) {
  return `${n.name} (${n.kind})`;
}

export function CreateShipmentForm({ nodes, onCreated }: Props) {
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [description, setDescription] = useState("");
  const [cargo, setCargo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [driverDeviceId, setDriverDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const d = (await res.json()) as { drivers: DriverRow[] };
      setDrivers(d.drivers);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
