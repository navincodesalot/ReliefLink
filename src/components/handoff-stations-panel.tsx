"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
import type { Batch, HandoffStation } from "@/lib/types";

const SECRET_KEY = "relieflink-station-secret";

type Row = {
  /** Stable React key for rows not yet persisted under this deviceId */
  tempKey?: string;
  deviceId: string;
  displayName: string;
  batchId: string;
  from: string;
  to: string;
};

function stationToRow(s: HandoffStation): Row {
  return {
    deviceId: s.deviceId,
    displayName: s.displayName ?? "",
    batchId: s.batchId ?? "",
    from: s.from ?? "",
    to: s.to ?? "",
  };
}

export function HandoffStationsPanel() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem(SECRET_KEY);
    if (s) setSavedSecret(s);
  }, []);

  const authHeaders = useCallback(() => {
    if (!savedSecret) return null;
    return { "x-relieflink-secret": savedSecret };
  }, [savedSecret]);

  const loadBatches = useCallback(async () => {
    const res = await fetch("/api/batches", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { batches: Batch[] };
    setBatches(data.batches);
  }, []);

  const loadStations = useCallback(async () => {
    const h = authHeaders();
    if (!h) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/handoff-stations", { headers: h, cache: "no-store" });
      const data = (await res.json()) as { error?: string; stations?: HandoffStation[] };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const list = data.stations ?? [];
      setRows(list.map(stationToRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (savedSecret) void loadStations();
  }, [savedSecret, loadStations]);

  function persistSecret() {
    const t = secret.trim();
    if (!t) return;
    sessionStorage.setItem(SECRET_KEY, t);
    setSavedSecret(t);
    setSecret("");
  }

  function forgetSecret() {
    sessionStorage.removeItem(SECRET_KEY);
    setSavedSecret(null);
    setRows([]);
  }

  function rowKey(r: Row) {
    return r.tempKey ?? r.deviceId;
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (rowKey(r) === key ? { ...r, ...patch } : r)),
    );
  }

  async function saveRow(row: Row) {
    const h = authHeaders();
    if (!h) return;
    const id = row.deviceId.trim();
    if (!id) {
      setError("Device ID is required");
      return;
    }
    setRowBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/handoff-station/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: row.displayName,
          batchId: row.batchId,
          from: row.from,
          to: row.to,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await loadStations();
      setNewDeviceId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setRowBusy(null);
    }
  }

  function addRow() {
    const id = newDeviceId.trim();
    if (!id) {
      setError("Enter a device ID first (e.g. field-uno-01)");
      return;
    }
    if (rows.some((r) => r.deviceId === id)) {
      setError("That device ID is already in the list");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        tempKey: `t-${Date.now()}`,
        deviceId: id,
        displayName: "",
        batchId: "",
        from: "",
        to: "",
      },
    ]);
    setNewDeviceId("");
  }

  function batchHint(batchId: string) {
    const b = batches.find((x) => x.batchId === batchId);
    if (!b) return null;
    return `Current holder: ${b.currentHolder}`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Handoff stations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Map each physical board (USB bridge <code className="text-xs">DEVICE_ID</code>) to a
            batch and the next <code className="text-xs">from</code> → <code className="text-xs">to</code>{" "}
            roles. The field laptop fetches this before each PIN; nothing is hard-coded per batch in
            <code className="text-xs"> .env</code> anymore.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Use the same value as server <code className="text-xs">TRANSFER_SECRET</code> (sent as{" "}
            <code className="text-xs">x-relieflink-secret</code>, kept in session only).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          {!savedSecret ? (
            <>
              <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                <Label htmlFor="secret">TRANSFER_SECRET</Label>
                <Input
                  id="secret"
                  type="password"
                  autoComplete="off"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Paste secret once"
                />
              </div>
              <Button type="button" onClick={persistSecret}>
                Unlock
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Session unlocked.</p>
              <Button type="button" variant="outline" size="sm" onClick={forgetSecret}>
                Lock
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {savedSecret ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
            <div>
              <CardTitle>Stations</CardTitle>
              <CardDescription>
                <code className="text-xs">from</code> must match the batch&apos;s current holder for a
                valid handoff.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={() => void loadStations()}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {loading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}

            <div className="flex flex-wrap items-end gap-2 border-b border-border pb-4">
              <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <Label htmlFor="newDev">New device ID</Label>
                <Input
                  id="newDev"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="field-uno-01"
                  pattern="[a-zA-Z0-9._-]+"
                />
              </div>
              <Button type="button" variant="secondary" onClick={addRow}>
                Add row
              </Button>
            </div>

            <div className="space-y-8">
              {rows.map((row) => (
                <div
                  key={row.tempKey ?? row.deviceId}
                  className="grid gap-3 border-b border-border pb-6 last:border-0 md:grid-cols-2 lg:grid-cols-6"
                >
                  <div className="space-y-1.5 lg:col-span-1">
                    <Label>Device ID</Label>
                    <Input
                      value={row.deviceId}
                      disabled={!row.tempKey}
                      onChange={(e) =>
                        row.tempKey
                          ? updateRow(rowKey(row), { deviceId: e.target.value })
                          : undefined
                      }
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-1">
                    <Label>Label</Label>
                    <Input
                      value={row.displayName}
                      onChange={(e) => updateRow(rowKey(row), { displayName: e.target.value })}
                      placeholder="Warehouse desk"
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-1">
                    <Label>Batch ID</Label>
                    <Input
                      list={`batch-pick-${rowKey(row)}`}
                      value={row.batchId}
                      onChange={(e) => updateRow(rowKey(row), { batchId: e.target.value })}
                      placeholder="batch-…"
                    />
                    <datalist id={`batch-pick-${rowKey(row)}`}>
                      {batches.map((b) => (
                        <option key={b.batchId} value={b.batchId} />
                      ))}
                    </datalist>
                    {row.batchId ? (
                      <p className="text-xs text-muted-foreground">{batchHint(row.batchId)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5 lg:col-span-1">
                    <Label>From (role)</Label>
                    <Input
                      value={row.from}
                      onChange={(e) => updateRow(rowKey(row), { from: e.target.value })}
                      placeholder="warehouse-1"
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-1">
                    <Label>To (role)</Label>
                    <Input
                      value={row.to}
                      onChange={(e) => updateRow(rowKey(row), { to: e.target.value })}
                      placeholder="transporter-1"
                    />
                  </div>
                  <div className="flex items-end lg:col-span-1">
                    <Button
                      type="button"
                      className="w-full"
                      disabled={rowBusy === row.deviceId}
                      onClick={() => void saveRow(row)}
                    >
                      {rowBusy === row.deviceId ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {rows.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">
                No stations yet. Add a device ID that matches{" "}
                <code className="text-xs">DEVICE_ID</code> in the USB bridge <code className="text-xs">.env</code>.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
