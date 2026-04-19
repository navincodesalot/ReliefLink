"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Flag, Radio } from "lucide-react";
import { toast } from "sonner";

import {
  SearchableSelect,
  type SearchOption,
} from "@/components/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { runStagedLedgerUi } from "@/lib/staged-ledger-ui";
import type {
  NodeJSON,
  ShipmentJSON,
  ShipmentLegJSON,
  TransferEventJSON,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type DriverRow = {
  driverDeviceId: string;
  name: string;
  email: string;
};

type Props = {
  shipments: ShipmentJSON[];
  nodes: NodeJSON[];
  onTap?: (shipmentId: string, legIndex: number) => void;
  onChanged?: () => void;
  readOnly?: boolean;
};

type ShipmentDetail = {
  legs: ShipmentLegJSON[];
  events: TransferEventJSON[];
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export function ShipmentsTable({
  shipments,
  nodes,
  onTap,
  onChanged,
  readOnly = false,
}: Props) {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;

  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ShipmentDetail>>({});
  const [tapping, setTapping] = useState<string | null>(null);
  const [assignBusy, setAssignBusy] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const d = (await res.json()) as { drivers: DriverRow[] };
      setDrivers(d.drivers);
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const driverOptions: SearchOption[] = drivers.map((d) => ({
    value: d.driverDeviceId,
    label: d.name,
    description: d.driverDeviceId,
    keywords: [d.email, d.driverDeviceId],
  }));

  const loadDetail = useCallback(async (shipmentId: string) => {
    const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as ShipmentDetail;
    setDetails((prev) => ({
      ...prev,
      [shipmentId]: { legs: data.legs ?? [], events: data.events ?? [] },
    }));
  }, []);

  useEffect(() => {
    if (expanded) void loadDetail(expanded);
  }, [expanded, loadDetail, shipments]);

  async function handleSimulateTap(shipmentId: string, legIndex: number) {
    setTapping(`${shipmentId}:${legIndex}`);
    try {
      await runStagedLedgerUi({
        steps: [
          { label: "Connecting to beacon…" },
          { label: "Verifying driver credentials…" },
          { label: "Signing handoff payload…" },
          { label: "Anchoring on Solana…" },
        ],
        successLabel: `Leg ${legIndex} anchored on Solana.`,
        errorLabel: "Simulated tap failed.",
        run: async () => {
          const res = await fetch(
            `/api/shipments/${encodeURIComponent(shipmentId)}/simulate-tap`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ legIndex }),
            },
          );
          const data = (await res.json()) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
          return data;
        },
      });
      onTap?.(shipmentId, legIndex);
      await loadDetail(shipmentId);
    } catch {
      // toast already surfaced
    } finally {
      setTapping(null);
    }
  }

  async function handleAssignDevice(
    shipmentId: string,
    legIndex: number,
    deviceId: string,
  ) {
    setAssignBusy(`${shipmentId}:${legIndex}`);
    try {
      const res = await fetch(
        `/api/shipments/${encodeURIComponent(shipmentId)}/legs/${legIndex}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverDeviceId: deviceId || null }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? `HTTP ${res.status}`);
      } else {
        toast.success(deviceId ? "Driver assigned." : "Driver cleared.");
      }
      await loadDetail(shipmentId);
      onChanged?.();
    } finally {
      setAssignBusy(null);
    }
  }

  if (shipments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {readOnly
          ? "No shipments to display yet."
          : "No shipments yet. Create one on the right to launch the first hop."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-8 px-3 py-2.5" />
            <th className="px-3 py-2.5 font-medium">Shipment</th>
            <th className="px-3 py-2.5 font-medium">Route</th>
            <th className="px-3 py-2.5 font-medium">Progress</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Chain</th>
            <th className="px-3 py-2.5 font-medium">Last</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {shipments.map((s) => {
            const isOpen = expanded === s.shipmentId;
            const detail = details[s.shipmentId];
            const sigCount = s.solanaSignatures.length;
            return (
              <Fragment key={s.shipmentId}>
                <tr
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpanded(isOpen ? null : s.shipmentId)}
                >
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    <div>{s.shipmentId}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {s.description ?? s.cargo ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {s.nodeRoute.map((id, i) => (
                      <span key={`${id}-${i}`}>
                        <span
                          className={cn(
                            i <= s.completedLegs && "font-semibold text-foreground",
                          )}
                        >
                          {nameOf(id)}
                        </span>
                        {i < s.nodeRoute.length - 1 ? " → " : ""}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2.5">
                    <ProgressBar value={s.progressPct} flagged={s.isFlagged} />
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.completedLegs}/{s.totalLegs} legs
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill shipment={s} />
                  </td>
                  <td className="px-3 py-2.5">
                    {sigCount > 0 ? (
                      <span className="text-xs tabular-nums">
                        {sigCount} tx
                        {sigCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatTime(s.lastUpdated)}
                  </td>
                </tr>

                {isOpen ? (
                  <tr className="bg-muted/30">
                    <td />
                    <td colSpan={6} className="px-3 py-4">
                      {!detail ? (
                        <p className="text-xs text-muted-foreground">Loading legs…</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            {detail.legs.map((leg) => {
                              const busyKey = `${s.shipmentId}:${leg.index}`;
                              return (
                                <div
                                  key={leg.id}
                                  className={
                                    "grid grid-cols-1 items-center gap-2 rounded-md border bg-background p-3 " +
                                    (readOnly
                                      ? "md:grid-cols-[auto_1fr]"
                                      : "md:grid-cols-[auto_1fr_auto_auto]")
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <LegStatusDot status={leg.status} />
                                    <span className="text-xs font-mono text-muted-foreground">
                                      leg {leg.index}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      {nameOf(leg.fromNodeId)}
                                    </span>{" "}
                                    →{" "}
                                    <span className="font-medium">
                                      {nameOf(leg.toNodeId)}
                                    </span>
                                    {leg.solanaExplorerUrl ? (
                                      <a
                                        href={leg.solanaExplorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        tx <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : null}
                                  </div>
                                  {readOnly ? (
                                    <div className="text-xs text-muted-foreground">
                                      {leg.driverDeviceId
                                        ? `Device ${leg.driverDeviceId}`
                                        : "No driver device assigned"}
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className="w-56"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <SearchableSelect
                                          options={driverOptions}
                                          value={leg.driverDeviceId ?? ""}
                                          onChange={(v) =>
                                            handleAssignDevice(
                                              s.shipmentId,
                                              leg.index,
                                              v,
                                            )
                                          }
                                          placeholder={
                                            drivers.length === 0
                                              ? "No drivers seeded…"
                                              : "Assign driver…"
                                          }
                                          searchPlaceholder="Search drivers…"
                                          emptyMessage="No matching drivers."
                                          disabled={
                                            assignBusy === busyKey ||
                                            leg.status === "done"
                                          }
                                          clearable
                                        />
                                      </div>
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="sm"
                                          variant={
                                            leg.status === "in_transit"
                                              ? "default"
                                              : "outline"
                                          }
                                          disabled={
                                            leg.status !== "in_transit" ||
                                            tapping === busyKey
                                          }
                                          onClick={() =>
                                            handleSimulateTap(s.shipmentId, leg.index)
                                          }
                                        >
                                          <Radio className="h-3.5 w-3.5" />
                                          {tapping === busyKey
                                            ? "Signing..."
                                            : leg.status === "done"
                                              ? "Tapped"
                                              : "Simulate tap"}
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {detail.events.length > 0 ? (
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Transfer events
                              </div>
                              <ul className="space-y-1 text-xs">
                                {detail.events.map((e) => (
                                  <li
                                    key={e.id}
                                    className="flex flex-wrap items-center gap-2"
                                  >
                                    <span className="text-muted-foreground">
                                      {formatTime(e.timestamp)}
                                    </span>
                                    <span>
                                      leg {e.legIndex} · {nameOf(e.fromNodeId)} →{" "}
                                      {nameOf(e.toNodeId)}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {e.source === "hardware_tap"
                                        ? "hardware"
                                        : "simulated"}
                                    </span>
                                    {e.isAnomaly ? (
                                      <Badge variant="destructive">
                                        {e.anomalyReason}
                                      </Badge>
                                    ) : null}
                                    {e.solanaExplorerUrl ? (
                                      <a
                                        href={e.solanaExplorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                      >
                                        solana tx{" "}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProgressBar({ value, flagged }: { value: number; flagged: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full transition-all",
          flagged ? "bg-destructive" : pct >= 100 ? "bg-emerald-500" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusPill({ shipment }: { shipment: ShipmentJSON }) {
  if (shipment.isFlagged || shipment.status === "flagged") {
    return (
      <Badge variant="destructive">
        <Flag className="mr-1 h-3 w-3" />
        flagged
      </Badge>
    );
  }
  if (shipment.status === "delivered") {
    return <Badge variant="success">delivered</Badge>;
  }
  if (shipment.status === "in_transit") {
    return <Badge variant="warning">in transit</Badge>;
  }
  return <Badge variant="secondary">{shipment.status}</Badge>;
}

function LegStatusDot({ status }: { status: ShipmentLegJSON["status"] }) {
  const color =
    status === "done"
      ? "bg-emerald-500"
      : status === "in_transit"
        ? "bg-amber-500"
        : status === "flagged"
          ? "bg-destructive"
          : "bg-muted-foreground";
  return <span className={cn("h-2 w-2 rounded-full", color)} />;
}

