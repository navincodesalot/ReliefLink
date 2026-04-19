"use client";

import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { NodeJSON, ShipmentJSON } from "@/lib/types";

export type DriverLocationPin = {
  deviceId: string;
  lat: number;
  lng: number;
  updatedAt?: string | null;
};

type Props = {
  nodes: NodeJSON[];
  shipments: ShipmentJSON[];
  /** Live GPS pins (drivers). */
  driverLocations?: DriverLocationPin[];
};

const KIND_COLORS: Record<NodeJSON["kind"], string> = {
  warehouse: "#2563eb",
  store: "#16a34a",
  home: "#f59e0b",
  other: "#64748b",
};

type NodeActivity = "idle" | "active" | "next";

function divIcon({
  color,
  emoji,
  dim = false,
  activity = "idle",
}: {
  color: string;
  emoji: string;
  dim?: boolean;
  activity?: NodeActivity;
}) {
  const pulseClass =
    activity === "next"
      ? "relieflink-node relieflink-node--pulse relieflink-node--next"
      : activity === "active"
        ? "relieflink-node relieflink-node--pulse"
        : "relieflink-node";
  return L.divIcon({
    className: "relieflink-marker",
    html: `
      <div
        class="${pulseClass}"
        style="background:${color};color:${color};opacity:${dim ? 0.55 : 1};"
      >
        <span style="position:relative;z-index:1;color:white;">${emoji}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const driverIcon = divIcon({ color: "#ea580c", emoji: "D", activity: "active" });

function iconFor(node: NodeJSON, activity: NodeActivity) {
  const color = KIND_COLORS[node.kind] ?? KIND_COLORS.other;
  const glyph =
    node.kind === "warehouse"
      ? "W"
      : node.kind === "store"
        ? node.hasHardware
          ? "A"
          : "S"
        : node.kind === "home"
          ? "H"
          : "·";
  return divIcon({
    color,
    emoji: glyph,
    dim: !node.active || node.pendingOnboarding,
    activity,
  });
}

export function NetworkMap({ nodes, shipments, driverLocations }: Props) {
  const center = useMemo(() => {
    if (nodes.length === 0) return [20, 0] as [number, number];
    const lat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;
    const lng = nodes.reduce((s, n) => s + n.lng, 0) / nodes.length;
    return [lat, lng] as [number, number];
  }, [nodes]);

  const byId = useMemo(() => {
    const m = new Map<string, NodeJSON>();
    for (const n of nodes) m.set(n.nodeId, n);
    return m;
  }, [nodes]);

  /**
   * Classify each node by shipment activity:
   *   - "next" = current destination of an in-flight shipment (strong pulse)
   *   - "active" = any other stop on an in-flight shipment
   *   - "idle" = untouched
   */
  const activityByNode = useMemo(() => {
    const out = new Map<string, NodeActivity>();
    const promote = (id: string, level: NodeActivity) => {
      const rank: Record<NodeActivity, number> = { idle: 0, active: 1, next: 2 };
      const cur = out.get(id) ?? "idle";
      if (rank[level] > rank[cur]) out.set(id, level);
    };

    for (const s of shipments) {
      if (s.status === "delivered" || s.status === "flagged") continue;
      const route = s.nodeRoute;
      if (route.length < 2) continue;
      for (const id of route) promote(id, "active");
      const nextIdx = Math.min(route.length - 1, s.completedLegs + 1);
      const nextId = route[nextIdx];
      if (nextId) promote(nextId, "next");
    }
    return out;
  }, [shipments]);

  const activeRoutes = useMemo(() => {
    type Segment = {
      key: string;
      color: string;
      dashArray?: string;
      positions: [number, number][];
      label: string;
      animate: "none" | "active" | "flagged";
    };
    const segs: Segment[] = [];
    for (const s of shipments) {
      if (s.status === "delivered") continue;
      const pts = s.nodeRoute
        .map((id) => byId.get(id))
        .filter((n): n is NodeJSON => Boolean(n))
        .map((n) => [n.lat, n.lng] as [number, number]);
      if (pts.length < 2) continue;

      const completedSlice = pts.slice(0, s.completedLegs + 1);
      const remainingSlice = pts.slice(Math.max(0, s.completedLegs));

      if (completedSlice.length >= 2) {
        segs.push({
          key: `${s.shipmentId}:done`,
          color: "#16a34a",
          positions: completedSlice,
          label: `${s.shipmentId} · completed`,
          animate: "none",
        });
      }
      if (
        remainingSlice.length >= 2 &&
        s.status !== "delivered" &&
        s.status !== "flagged"
      ) {
        segs.push({
          key: `${s.shipmentId}:pending`,
          color: "#2563eb",
          dashArray: "6 6",
          positions: remainingSlice,
          label: `${s.shipmentId} · remaining`,
          animate: "active",
        });
      }
      if (s.status === "flagged") {
        segs.push({
          key: `${s.shipmentId}:flagged`,
          color: "#dc2626",
          dashArray: "4 8",
          positions: pts,
          label: `${s.shipmentId} · flagged`,
          animate: "flagged",
        });
      }
    }
    return segs;
  }, [shipments, byId]);

  return (
    <MapContainer
      center={center}
      zoom={2}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {activeRoutes.map((seg) => (
        <Polyline
          key={seg.key}
          positions={seg.positions}
          pathOptions={{
            color: seg.color,
            weight: 3,
            opacity: 0.85,
            dashArray: seg.dashArray,
            className:
              seg.animate === "active"
                ? "relieflink-route-active"
                : seg.animate === "flagged"
                  ? "relieflink-route-flagged"
                  : undefined,
          }}
        />
      ))}
      {nodes.map((n) => {
        const activity = activityByNode.get(n.nodeId) ?? "idle";
        return (
          <Marker key={n.nodeId} position={[n.lat, n.lng]} icon={iconFor(n, activity)}>
            <Popup>
              <div className="space-y-1 text-xs">
                <div className="text-sm font-semibold">{n.name}</div>
                <div className="text-muted-foreground">
                  {n.kind}
                  {n.hasHardware ? " · hardware-enabled" : " · seeded (no device)"}
                </div>
                <div className="font-mono">{n.nodeId}</div>
                {n.address ? <div>{n.address}</div> : null}
                <div className="text-muted-foreground">
                  {n.lat.toFixed(3)}, {n.lng.toFixed(3)}
                </div>
                {n.deviceId ? <div>device: {n.deviceId}</div> : null}
                {n.pendingOnboarding ? (
                  <div className="text-amber-600">pending onboarding</div>
                ) : null}
                {activity === "next" ? (
                  <div className="text-primary">next stop on an active shipment</div>
                ) : activity === "active" ? (
                  <div className="text-muted-foreground">on an active shipment</div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {(driverLocations ?? []).map((d) => (
        <Marker
          key={`drv-${d.deviceId}`}
          position={[d.lat, d.lng]}
          icon={driverIcon}
        >
          <Popup>
            <div className="space-y-1 text-xs">
              <div className="text-sm font-semibold">Driver device</div>
              <div className="font-mono">{d.deviceId}</div>
              {d.updatedAt ? (
                <div className="text-muted-foreground">
                  updated {new Date(d.updatedAt).toLocaleString()}
                </div>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default NetworkMap;
