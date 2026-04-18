"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  onCreated?: () => void;
};

export function CreateBatchForm({ onCreated }: Props) {
  const [batchId, setBatchId] = useState("");
  const [origin, setOrigin] = useState("warehouse-1");
  const [intendedDestination, setIntendedDestination] = useState("local-node-A");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/batch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batchId || `batch-${Date.now()}`,
          origin,
          intendedDestination,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      setBatchId("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <div className="space-y-1.5">
        <Label htmlFor="batchId">Batch ID</Label>
        <Input
          id="batchId"
          placeholder="auto if blank"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="origin">Origin</Label>
        <Input
          id="origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dest">Intended destination</Label>
        <Input
          id="dest"
          value={intendedDestination}
          onChange={(e) => setIntendedDestination(e.target.value)}
          required
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={busy} className="w-full md:w-auto">
          {busy ? "Creating…" : "Create batch"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive md:col-span-4">{error}</p>
      ) : null}
    </form>
  );
}
