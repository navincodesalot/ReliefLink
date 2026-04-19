"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  deviceId: string;
  message: string;
  status: string;
  createdAt: string | null;
};

export function AdminEmergenciesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [resolution, setResolution] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/emergencies", { cache: "no-store" });
    if (!res.ok) return;
    const d = (await res.json()) as { emergencies: Row[] };
    setRows(d.emergencies);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 6000);
    return () => clearInterval(id);
  }, [load]);

  async function acknowledge(id: string) {
    await fetch(`/api/emergencies/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "acknowledged" }),
    });
    void load();
  }

  async function resolve(id: string) {
    await fetch(`/api/emergencies/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        resolution: resolution[id] ?? "Resolved.",
      }),
    });
    void load();
  }

  const open = rows.filter((r) => r.status !== "resolved");

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 text-card-foreground dark:border-amber-500/25 dark:bg-amber-950/25">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-lg">Driver emergencies</CardTitle>
        </div>
        <CardDescription>
          Open requests for assistance from the field. Acknowledge quickly, then resolve with notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open emergencies.</p>
        ) : null}
        <ul className="space-y-4">
          {rows
            .filter((r) => r.status !== "resolved")
            .map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border bg-background p-4 text-sm text-foreground shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{r.deviceId}</span>
                <span className="text-xs uppercase text-muted-foreground">{r.status}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-foreground">{r.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
              </p>
              {r.status !== "resolved" ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`res-${r.id}`}>
                      Resolution notes
                    </label>
                    <Input
                      id={`res-${r.id}`}
                      value={resolution[r.id] ?? ""}
                      onChange={(e) =>
                        setResolution((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="What action was taken?"
                    />
                  </div>
                  <div className="flex gap-2">
                    {r.status === "open" ? (
                      <Button type="button" variant="secondary" size="sm" onClick={() => void acknowledge(r.id)}>
                        Acknowledge
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" onClick={() => void resolve(r.id)}>
                      Mark resolved
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
