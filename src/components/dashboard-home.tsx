"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Network, Truck } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
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
import { PendingDeviceOnboardingModal } from "@/components/pending-device-onboarding-modal";
import type { DriverLocationPin } from "@/components/network-map";
import { ShipmentsTable } from "@/components/shipments-table";
import type { ReliefLinkRole } from "@/lib/roles";
import type { DriverListItem, NodeJSON, ShipmentJSON } from "@/lib/types";

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

export type DashboardMode = "admin" | "readonly";

type DashboardHomeProps = {
  mode: DashboardMode;
  /** @deprecated kept for backwards compat; no longer used after auth removal. */
  sessionRole?: ReliefLinkRole;
  /** Admin: increment after registering a driver so dropdowns refetch immediately. */
  driversRefreshKey?: number;
};

export function DashboardHome({ mode, driversRefreshKey }: DashboardHomeProps) {
  const { t } = useLanguage();
  const readOnly = mode === "readonly";
  const [nodes, setNodes] = useState<NodeJSON[]>([]);
  const [shipments, setShipments] = useState<ShipmentJSON[]>([]);
  const [driverPins, setDriverPins] = useState<DriverLocationPin[]>([]);
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDriversRefreshKey = useRef(driversRefreshKey ?? 0);

  const loadAll = useCallback(async () => {
    const showDrivers = mode !== "readonly";
    try {
      const nr = await fetch("/api/nodes", { cache: "no-store" });
      const sr = await fetch("/api/shipments", { cache: "no-store" });
      if (!nr.ok) throw new Error(`nodes HTTP ${nr.status}`);
      if (!sr.ok) throw new Error(`shipments HTTP ${sr.status}`);
      const nd = (await nr.json()) as { nodes: NodeJSON[] };
      const sd = (await sr.json()) as { shipments: ShipmentJSON[] };
      setNodes(nd.nodes);
      setShipments(sd.shipments);

      if (showDrivers) {
        const lr = await fetch("/api/driver-locations", { cache: "no-store" });
        if (lr.ok) {
          const loc = (await lr.json()) as {
            locations: {
              deviceId: string;
              lat: number;
              lng: number;
              updatedAt: string | null;
            }[];
          };
          setDriverPins(
            loc.locations.map((l) => ({
              deviceId: l.deviceId,
              lat: l.lat,
              lng: l.lng,
              updatedAt: l.updatedAt,
            })),
          );
        }
        const dr = await fetch("/api/drivers", { cache: "no-store" });
        if (dr.ok) {
          const dd = (await dr.json()) as { drivers: DriverListItem[] };
          setDrivers(dd.drivers);
        } else {
          setDrivers([]);
        }
      } else {
        setDriverPins([]);
        setDrivers([]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoaded(true);
    }
  }, [mode]);

  useEffect(() => {
    void loadAll();
    pollTimer.current = setInterval(() => void loadAll(), POLL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [loadAll]);

  const refreshKey = driversRefreshKey ?? 0;
  useEffect(() => {
    if (prevDriversRefreshKey.current === refreshKey) return;
    prevDriversRefreshKey.current = refreshKey;
    void loadAll();
  }, [refreshKey, loadAll]);

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

  const eyebrow = readOnly ? t("transparency") : t("operations");
  const title = readOnly ? (
    <>
      ReliefLink <span className="text-muted-foreground">· {t("publicView")}</span>
    </>
  ) : (
    <>
      ReliefLink <span className="text-muted-foreground">· {t("nodeNetwork")}</span>
    </>
  );
  const subtitle = readOnly ? t("publicTagline") : t("tagline");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!readOnly ? (
            <Link href="/driver">
              <Button variant="outline" size="sm">
                <Truck className="h-4 w-4" /> {t("driverConsole")}
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Stat icon={<Network className="h-4 w-4" />} label={t("nodes")} value={nodes.length} />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label={t("inTransit")}
          value={activeCount}
        />
        <Stat
          icon={<Truck className="h-4 w-4" />}
          label={t("delivered")}
          value={deliveredCount}
        />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label={t("flagged")}
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

      {!readOnly && mode === "admin" ? (
        <PendingDeviceOnboardingModal
          pending={pending}
          onPromoted={() => void loadAll()}
          onDismissed={() => void loadAll()}
        />
      ) : null}

      <section
        className={
          readOnly
            ? "grid gap-6"
            : "grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
        }
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">{t("liveNetworkMap")}</CardTitle>
            <CardDescription>
              {readOnly ? t("mapLegendReadOnly") : t("mapLegend")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px] w-full">
              <NetworkMap
                nodes={nodes}
                shipments={shipments}
                driverLocations={readOnly ? undefined : driverPins}
              />
            </div>
          </CardContent>
        </Card>

        {!readOnly ? (
          <div className="space-y-6">
            <CreateShipmentForm
              nodes={nodes}
              drivers={drivers}
              onCreated={() => void loadAll()}
            />
            <CreateNodeForm onCreated={() => void loadAll()} />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{t("shipments")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("pollingEvery")} {POLL_MS / 1000}s
          </span>
        </div>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading shipments…</p>
        ) : (
          <ShipmentsTable
            shipments={shipments}
            nodes={nodes}
            drivers={drivers}
            onTap={() => void loadAll()}
            onChanged={() => void loadAll()}
            readOnly={readOnly}
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
