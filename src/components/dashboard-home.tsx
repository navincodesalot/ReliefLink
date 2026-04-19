"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Network, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateNodeForm } from "@/components/create-node-form";
import { CreateShipmentForm } from "@/components/create-shipment-form";
import { PendingDevicesPanel } from "@/components/pending-devices-panel";
import { ShipmentsTable } from "@/components/shipments-table";
import type { NodeJSON, ShipmentJSON } from "@/lib/types";

const NetworkMap = dynamic(
  () => import("@/components/network-map").then((m) => m.NetworkMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
      Loading map…
    </div>
  );
}

const POLL_MS = 2500;

export function DashboardHome() {
  const [nodes, setNodes] = useState<NodeJSON[]>([]);
  const [shipments, setShipments] = useState<ShipmentJSON[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [nr, sr] = await Promise.all([
        fetch("/api/nodes", { cache: "no-store" }),
        fetch("/api/shipments", { cache: "no-store" }),
      ]);
      if (!nr.ok) throw new Error(`nodes HTTP ${nr.status}`);
      if (!sr.ok) throw new Error(`shipments HTTP ${sr.status}`);
      const nd = (await nr.json()) as { nodes: NodeJSON[] };
      const sd = (await sr.json()) as { shipments: ShipmentJSON[] };
      setNodes(nd.nodes);
      setShipments(sd.shipments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    pollTimer.current = setInterval(() => void loadAll(), POLL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [loadAll]);

  const pending = useMemo(() => nodes.filter((n) => n.pendingOnboarding), [nodes]);
  const activeCount = useMemo(
    () => shipments.filter((s) => s.status === "in_transit").length,
    [shipments],
  );
  const deliveredCount = useMemo(
    () => shipments.filter((s) => s.status === "delivered").length,
    [shipments],
  );
  const flaggedCount = useMemo(
    () => shipments.filter((s) => s.isFlagged).length,
    [shipments],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            ReliefLink <span className="text-muted-foreground">· Node Network</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            UN-coordinated food aid routed through warehouses and local beacon
            nodes. Every hop is cryptographically anchored on Solana testnet at
            the moment of physical handoff.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/driver">
            <Button variant="outline" size="sm">
              <Truck className="h-4 w-4" /> Driver console
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Stat icon={<Network className="h-4 w-4" />} label="Nodes" value={nodes.length} />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="In transit"
          value={activeCount}
        />
        <Stat
          icon={<Truck className="h-4 w-4" />}
          label="Delivered"
          value={deliveredCount}
        />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="Flagged"
          value={flaggedCount}
          tone={flaggedCount > 0 ? "destructive" : "muted"}
        />
      </section>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <PendingDevicesPanel
          pending={pending}
          onPromoted={() => void loadAll()}
          onDismissed={() => void loadAll()}
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Live network map</CardTitle>
            <CardDescription>
              Warehouses in blue · beacon nodes in green · active routes in blue
              dashed · completed legs in solid green.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px] w-full">
              <NetworkMap nodes={nodes} shipments={shipments} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <CreateShipmentForm nodes={nodes} onCreated={() => void loadAll()} />
          <CreateNodeForm onCreated={() => void loadAll()} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Shipments</h2>
          <span className="text-xs text-muted-foreground">
            polling every {POLL_MS / 1000}s
          </span>
        </div>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading shipments…</p>
        ) : (
          <ShipmentsTable
            shipments={shipments}
            nodes={nodes}
            onTap={() => void loadAll()}
            onChanged={() => void loadAll()}
          />
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "muted" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div
            className={
              "mt-1 text-2xl font-semibold " +
              (tone === "destructive" ? "text-destructive" : "")
            }
          >
            {value}
          </div>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
