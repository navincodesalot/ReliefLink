"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Cpu, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { nativeSelectClassName } from "@/lib/form-classes";
import { NODE_KINDS, type NodeKind } from "@/lib/constants";
import type { NodeJSON } from "@/lib/types";

type Props = {
  pending: NodeJSON[];
  onPromoted: () => void;
  onDismissed: () => void;
};

/**
 * When the USB bridge registers an unknown device, `/api/devices/register` creates a
 * placeholder node. This modal opens automatically so the admin can turn it into a
 * warehouse or store (beacon) with a real location—no separate registration forms.
 */
export function PendingDeviceOnboardingModal({
  pending,
  onPromoted,
  onDismissed,
}: Props) {
  const skippedRef = useRef<Set<string>>(new Set());
  const [current, setCurrent] = useState<NodeJSON | null>(null);
  const [skipTick, setSkipTick] = useState(0);

  useEffect(() => {
    if (pending.length === 0) {
      setCurrent(null);
      return;
    }
    const next =
      pending.find((n) => !skippedRef.current.has(n.nodeId)) ?? null;
    setCurrent(next);
  }, [pending, skipTick]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [current]);

  function handleLater() {
    if (current) skippedRef.current.add(current.nodeId);
    setSkipTick((x) => x + 1);
  }

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={handleLater}
      />
      <Card className="relative z-10 my-auto w-full max-w-lg border-primary/30 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              New device connected
            </CardTitle>
            <CardDescription>
              A field bridge reported hardware that is not yet on the map. Add it as a
              warehouse or local store node.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleLater}
            aria-label="Not now"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <PromoteForm
            key={current.nodeId}
            node={current}
            onPromoted={() => {
              skippedRef.current.delete(current.nodeId);
              onPromoted();
            }}
            onDeleted={onDismissed}
            onLater={handleLater}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PromoteForm({
  node,
  onPromoted,
  onDeleted,
  onLater,
}: {
  node: NodeJSON;
  onPromoted: () => void;
  onDeleted: () => void;
  onLater: () => void;
}) {
  const [name, setName] = useState(node.name);
  const [kind, setKind] = useState<NodeKind>(node.kind === "warehouse" ? "warehouse" : "store");
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
      setError("Name, latitude, and longitude are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/nodes/${encodeURIComponent(node.nodeId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
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
      toast.success(`Node "${name.trim()}" added to the map.`);
      onPromoted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
      setError(msg);
      toast.error(msg);
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
      toast.success("Device dismissed.");
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={promote} className="space-y-4">
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Device id</span>{" "}
        <span className="font-mono text-foreground">{node.deviceId ?? "—"}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onb-kind">Node type</Label>
        <select
          id="onb-kind"
          className={nativeSelectClassName()}
          value={kind}
          onChange={(e) => setKind(e.target.value as NodeKind)}
        >
          {NODE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k === "warehouse"
                ? "UN warehouse / hub"
                : k === "store"
                  ? "Local store / beacon"
                  : k === "home"
                    ? "Home / distribution point"
                    : "Other"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onb-name">Name</Label>
        <Input
          id="onb-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onb-address">Address</Label>
        <Input
          id="onb-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="optional"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="onb-lat">Latitude</Label>
          <Input
            id="onb-lat"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onb-lng">Longitude</Label>
          <Input
            id="onb-lng"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="outline" onClick={onLater} disabled={busy}>
          Not now
        </Button>
        <Button type="button" variant="destructive" onClick={() => void dismiss()} disabled={busy}>
          Remove device
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add node"}
        </Button>
      </div>
    </form>
  );
}
