"use client";

import { type FormEvent, useMemo, useState } from "react";
import { PackagePlus, X } from "lucide-react";

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

type Props = {
  nodes: NodeJSON[];
  onCreated: (shipment: ShipmentJSON) => void;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function CreateShipmentForm({ nodes, onCreated }: Props) {
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [cargo, setCargo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [driverDeviceId, setDriverDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originOptions = useMemo(() => nodes, [nodes]);
  const destinationOptions = useMemo(
    () => nodes.filter((n) => n.hasHardware && !n.pendingOnboarding),
    [nodes],
  );
  const waypointOptions = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.hasHardware &&
          !n.pendingOnboarding &&
          n.nodeId !== origin &&
          n.nodeId !== destination,
      ),
    [nodes, origin, destination],
  );

  const usedWaypoints = new Set(waypoints);

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
        waypoints: waypoints.filter(Boolean),
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
      onCreated(data.shipment);
      setDescription("");
      setCargo("");
      setQuantity("");
      setWaypoints([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
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
          Multi-hop relief jobs. Destinations need an assigned device (real or
          simulated via the tap button).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>From (origin)</Label>
            <select
              className={selectClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
            >
              <option value="">Select origin…</option>
              {originOptions.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.name} ({n.kind})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>To (final destination)</Label>
            <select
              className={selectClass}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            >
              <option value="">Select destination…</option>
              {destinationOptions.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.name} ({n.kind})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Waypoints (optional, in order)</Label>
            <div className="flex flex-wrap gap-2">
              {waypoints.map((w, i) => {
                const node = nodes.find((n) => n.nodeId === w);
                return (
                  <span
                    key={`${w}-${i}`}
                    className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs"
                  >
                    {node?.name ?? w}
                    <button
                      type="button"
                      onClick={() =>
                        setWaypoints((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`remove ${w}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              <select
                className={`${selectClass} max-w-xs`}
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setWaypoints((prev) => [...prev, e.target.value]);
                  }
                }}
              >
                <option value="">+ add waypoint…</option>
                {waypointOptions
                  .filter((n) => !usedWaypoints.has(n.nodeId))
                  .map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.name} ({n.kind})
                    </option>
                  ))}
              </select>
            </div>
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
            <Label htmlFor="ship-driver">Driver device ID (optional)</Label>
            <Input
              id="ship-driver"
              value={driverDeviceId}
              onChange={(e) => setDriverDeviceId(e.target.value)}
              placeholder="driver-uno-01"
              pattern="[-a-zA-Z0-9._]+"
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
