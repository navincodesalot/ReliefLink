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

/** Persists selected site; legacy key kept so existing sessions keep working. */
const STORAGE_KEY = "relieflink.warehouseNodeId";

function kindLabel(kind: NodeJSON["kind"]) {
  switch (kind) {
    case "warehouse":
      return "Warehouse";
    case "store":
      return "Store";
    case "home":
      return "Home";
    default:
      return "Other";
  }
}

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
      const siteNodes = d.nodes
        .filter((n) => n.active !== false)
        .sort((a, b) => {
          const byKind = a.kind.localeCompare(b.kind);
          if (byKind !== 0) return byKind;
          return a.name.localeCompare(b.name);
        });
      setNodes(siteNodes);
      setWarehouseNodeId((cur) => {
        if (cur && siteNodes.some((n) => n.nodeId === cur)) return cur;
        return siteNodes[0]?.nodeId ?? "";
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickSite(id: string) {
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
        description: `${kindLabel(n.kind)} · ${n.nodeId}`,
        keywords: [n.nodeId, n.kind, n.address ?? ""],
      })),
    [nodes],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Network node</CardTitle>
          <CardDescription>
            Choose any ReliefLink site—warehouses, stores, homes, or other nodes—to manage
            inventory and see late inbound legs. Search by name, kind, or node id.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="wh-picker">Active site</Label>
          <SearchableSelect
            id="wh-picker"
            options={options}
            value={warehouseNodeId}
            onChange={pickSite}
            placeholder={
              options.length === 0 ? "No nodes seeded yet…" : "Search nodes…"
            }
            searchPlaceholder="Search…"
            emptyMessage="No matching nodes."
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
