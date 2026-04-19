"use client";

import { useCallback, useEffect, useState } from "react";
import { ClockAlert } from "lucide-react";

import type { ShipmentLegJSON } from "@/lib/types";

type Alert = { leg: ShipmentLegJSON; startedAt: string | null };

export function WarehouseLateBanner({ warehouseNodeId }: { warehouseNodeId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = useCallback(async () => {
    if (!warehouseNodeId) return;
    const res = await fetch(
      `/api/warehouse/late-alerts?warehouseNodeId=${encodeURIComponent(warehouseNodeId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const d = (await res.json()) as { alerts: Alert[] };
    setAlerts(d.alerts ?? []);
  }, [warehouseNodeId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  if (alerts.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-start gap-2">
        <ClockAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Late inbound leg (over 1.5× ETA)</p>
          <ul className="mt-1 list-inside list-disc text-xs opacity-90">
            {alerts.map((a, i) => (
              <li key={i}>
                Shipment {a.leg.shipmentId} · leg {a.leg.index} → {a.leg.toNodeId}
                {a.startedAt ? ` · started ${new Date(a.startedAt).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
