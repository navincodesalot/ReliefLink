"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Radio,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { DriverJobJSON } from "@/lib/types";

const STORAGE_KEY = "relieflink.driverDeviceId";
const POLL_MS = 2500;

export function DriverConsole() {
  const [deviceId, setDeviceId] = useState("");
  const [draft, setDraft] = useState("");
  const [job, setJob] = useState<DriverJobJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
    setDeviceId(saved);
    setDraft(saved);
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/driver/${encodeURIComponent(id)}/jobs`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DriverJobJSON;
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    void load(deviceId);
    const id = setInterval(() => void load(deviceId), POLL_MS);
    return () => clearInterval(id);
  }, [deviceId, load]);

  function saveDevice() {
    const id = draft.trim();
    if (!id) {
      setError("enter a device ID");
      return;
    }
    if (!/^[-a-zA-Z0-9._]+$/.test(id)) {
      setError("device ID: letters, numbers, dot, underscore, hyphen only");
      return;
    }
    setError(null);
    setDeviceId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }

  function clearDevice() {
    setDeviceId("");
    setDraft("");
    setJob(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Operations
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Driver console
          </h1>
          <p className="text-sm text-muted-foreground">
            Simulated phone view for the USB-connected Arduino. Shows the active
            shipment leg for this device.
          </p>
        </div>
        {deviceId ? (
          <Button variant="ghost" size="sm" onClick={clearDevice}>
            switch device
          </Button>
        ) : null}
      </header>

      {!deviceId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in as driver</CardTitle>
            <CardDescription>
              Enter the device ID flashed onto the driver Arduino. Must match the
              bridge&apos;s <code className="text-xs">DEVICE_ID</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="did">Device ID</Label>
              <Input
                id="did"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="driver-uno-01"
                pattern="[-a-zA-Z0-9._]+"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveDevice();
                }}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button onClick={saveDevice}>Continue</Button>
          </CardContent>
        </Card>
      ) : (
        <JobCard job={job} deviceId={deviceId} loading={loading} error={error} />
      )}
    </div>
  );
}

function JobCard({
  job,
  deviceId,
  loading,
  error,
}: {
  job: DriverJobJSON | null;
  deviceId: string;
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }
  if (!job) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {loading ? "Checking for assignments…" : "No job found for this device."}
        </CardContent>
      </Card>
    );
  }

  const leg = job.leg;
  const shipment = job.shipment;

  if (!leg || !shipment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" />
            <span className="font-mono text-sm text-muted-foreground">
              {deviceId}
            </span>
          </CardTitle>
          <CardDescription>{job.message}</CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Waiting for an operator to assign this device to a shipment leg.
        </CardContent>
      </Card>
    );
  }

  const inTransit = leg.status === "in_transit";
  const done = leg.status === "done";
  const latestSig = shipment.latestSolanaExplorerUrl;
  const progress = shipment.progressPct;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Shipment {shipment.shipmentId}
            </CardTitle>
            <CardDescription>
              {shipment.description ?? shipment.cargo ?? "Relief cargo"}
              {shipment.quantity ? ` · ${shipment.quantity} units` : ""}
            </CardDescription>
          </div>
          <Badge variant={done ? "success" : inTransit ? "warning" : "secondary"}>
            {leg.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">
            {job.fromNode?.name ?? leg.fromNodeId}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{job.toNode?.name ?? leg.toNodeId}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            leg {leg.index + 1}/{shipment.totalLegs}
          </span>
        </div>

        {job.toNode ? (
          <div className="rounded-md border p-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{job.toNode.name}</div>
                {job.toNode.address ? (
                  <div className="text-xs text-muted-foreground">
                    {job.toNode.address}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  {job.toNode.lat.toFixed(4)}, {job.toNode.lng.toFixed(4)}
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${job.toNode.lat}&mlon=${job.toNode.lng}&zoom=14`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  open in map <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Shipment progress</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                shipment.isFlagged
                  ? "bg-destructive"
                  : progress >= 100
                    ? "bg-emerald-500"
                    : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          className={cn(
            "rounded-md border p-3 text-sm",
            inTransit && "border-amber-500/40 bg-amber-500/10",
            done && "border-emerald-500/40 bg-emerald-500/10",
          )}
        >
          {inTransit ? (
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse text-amber-600" />
              <div>
                <div className="font-medium">Waiting for tap at destination</div>
                <div className="text-xs text-muted-foreground">
                  Touch the driver&apos;s copper pad to the beacon&apos;s pad. The
                  store will buzz after 3 seconds and the handoff will sign on
                  Solana.
                </div>
              </div>
            </div>
          ) : done ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="font-medium">Leg complete</div>
                {leg.solanaExplorerUrl ? (
                  <a
                    href={leg.solanaExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    view chain anchor <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Leg is {leg.status}.</div>
          )}
        </div>

        {latestSig ? (
          <div className="text-xs text-muted-foreground">
            Latest on-chain anchor:{" "}
            <a
              href={latestSig}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {shipment.solanaSignatures[shipment.solanaSignatures.length - 1]?.slice(
                0,
                12,
              )}
              … <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
