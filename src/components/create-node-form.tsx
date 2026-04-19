"use client";

import { type FormEvent, useState } from "react";
import { MapPin } from "lucide-react";

import { nativeSelectClassName } from "@/lib/form-classes";
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
import type { NodeJSON } from "@/lib/types";
import { NODE_KINDS, type NodeKind } from "@/lib/constants";

type Props = {
  onCreated: (node: NodeJSON) => void;
};

export function CreateNodeForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<NodeKind>("store");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lngN)) {
      setError("name, lat, and lng are required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          lat: latN,
          lng: lngN,
          address: address.trim() || undefined,
          deviceId: deviceId.trim() || undefined,
          hasHardware: Boolean(deviceId.trim()),
        }),
      });
      const data = (await res.json()) as { error?: string; node?: NodeJSON };
      if (!res.ok || !data.node) throw new Error(data.error ?? `HTTP ${res.status}`);
      onCreated(data.node);
      setName("");
      setLat("");
      setLng("");
      setAddress("");
      setDeviceId("");
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
          <MapPin className="h-4 w-4" /> Add a beacon node
        </CardTitle>
        <CardDescription>
          Onboard a store, warehouse, or beacon with a coordinate. Hardware is
          optional — leave device ID blank for a simulated node.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alpha Food Beacon"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-kind">Kind</Label>
            <select
              id="node-kind"
              className={nativeSelectClassName()}
              value={kind}
              onChange={(e) => setKind(e.target.value as NodeKind)}
            >
              {NODE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-device">Device ID (optional)</Label>
            <Input
              id="node-device"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="driver-uno-01"
              pattern="[-a-zA-Z0-9._]+"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-lat">Latitude</Label>
            <Input
              id="node-lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="40.7128"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-lng">Longitude</Label>
            <Input
              id="node-lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-74.0060"
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="node-address">Address (optional)</Label>
            <Input
              id="node-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="New York, USA"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Adding..." : "Add node"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
