"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SearchableSelect,
  type SearchOption,
} from "@/components/searchable-select";
import { WarehouseFoodPanel } from "@/components/warehouse-food-panel";
import { WarehouseInventorySnapshot } from "@/components/warehouse-inventory-snapshot";
import { WarehouseLateBanner } from "@/components/warehouse-late-banner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { NodeJSON } from "@/lib/types";

const STORAGE_KEY = "relieflink.warehouseNodeId";

export function WarehouseFoodWorkspace() {
  const [nodes, setNodes] = useState<NodeJSON[]>([]);
  const [warehouseNodeId, setWarehouseNodeId] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setWarehouseNodeId(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/nodes", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const d = (await res.json()) as { nodes: NodeJSON[] };
      const warehouses = d.nodes.filter((n) => n.kind === "warehouse");
      setNodes(warehouses);
      setWarehouseNodeId((cur) => {
        if (cur && warehouses.some((n) => n.nodeId === cur)) return cur;
        return warehouses[0]?.nodeId ?? "";
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickWarehouse(id: string) {
    setWarehouseNodeId(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const options: SearchOption[] = useMemo(
    () =>
      nodes.map((n) => ({
        value: n.nodeId,
        label: n.name,
        description: n.nodeId,
        keywords: [n.nodeId, n.kind, n.address ?? ""],
      })),
    [nodes],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warehouse</CardTitle>
          <CardDescription>
            Pick the UN warehouse this workspace manages. Search by name or node id.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="wh-picker">Active warehouse</Label>
          <SearchableSelect
            id="wh-picker"
            options={options}
            value={warehouseNodeId}
            onChange={pickWarehouse}
            placeholder={
              options.length === 0 ? "No warehouses seeded yet…" : "Search warehouses…"
            }
            searchPlaceholder="Search…"
            emptyMessage="No matching warehouses."
          />
        </CardContent>
      </Card>

      {warehouseNodeId ? (
        <>
          <WarehouseLateBanner warehouseNodeId={warehouseNodeId} />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <WarehouseInventorySnapshot
              warehouseNodeId={warehouseNodeId}
              version={version}
            />
            <WarehouseFoodPanel
              warehouseNodeId={warehouseNodeId}
              onSaved={() => setVersion((v) => v + 1)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
