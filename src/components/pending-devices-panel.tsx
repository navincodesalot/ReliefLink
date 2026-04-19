"use client";

import { type FormEvent, useState } from "react";
import { Cpu, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type Props = {
  pending: NodeJSON[];
  onPromoted: () => void;
  onDismissed: () => void;
};

export function PendingDevicesPanel({ pending, onPromoted, onDismissed }: Props) {
  if (pending.length === 0) return null;
  return (
    <Card className="border-amber-500/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="h-4 w-4" /> New hardware pending
          <Badge variant="warning">{pending.length}</Badge>
        </CardTitle>
        <CardDescription>
          A bridge registered an unknown device. Promote each one to a real node by
          giving it a location and name, or dismiss to remove the placeholder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.map((n) => (
          <PromoteRow
            key={n.nodeId}
            node={n}
            onPromoted={onPromoted}
            onDismissed={onDismissed}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PromoteRow({
  node,
  onPromoted,
  onDismissed,
}: {
  node: NodeJSON;
  onPromoted: () => void;
  onDismissed: () => void;
}) {
  const [name, setName] = useState(node.name);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState(node.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function promote(e: FormEvent<HTMLFormElement>) {
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
      const res = await fetch(`/api/nodes/${encodeURIComponent(node.nodeId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          lat: latN,
          lng: lngN,
          address: address.trim() || null,
          active: true,
          pendingOnboarding: false,
          hasHardware: true,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onPromoted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    setBusy(true);
    try {
      await fetch(`/api/nodes/${encodeURIComponent(node.nodeId)}`, {
        method: "DELETE",
      });
      onDismissed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={promote} className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-mono">{node.deviceId ?? node.nodeId}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            placeholder: {node.nodeId}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={dismiss}
          disabled={busy}
        >
          <Trash2 className="h-3.5 w-3.5" /> dismiss
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Latitude</Label>
          <Input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Longitude</Label>
          <Input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Promoting..." : "Promote to node"}
        </Button>
      </div>
    </form>
  );
}
