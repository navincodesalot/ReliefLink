"use client";

import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { NodeJSON, ShipmentJSON } from "@/lib/types";

type Props = {
  nodes: NodeJSON[];
  shipments: ShipmentJSON[];
};

const KIND_COLORS: Record<NodeJSON["kind"], string> = {
  warehouse: "#2563eb",
  store: "#16a34a",
  home: "#f59e0b",
  other: "#64748b",
};

function divIcon(color: string, emoji: string, dim = false) {
  return L.divIcon({
    className: "relieflink-marker",
    html: `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:50%;
        background:${color};color:white;font-size:14px;line-height:1;
        box-shadow:0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,.25);
        opacity:${dim ? 0.55 : 1};
      ">${emoji}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function iconFor(node: NodeJSON) {
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
  return divIcon(color, glyph, !node.active || node.pendingOnboarding);
}

export function NetworkMap({ nodes, shipments }: Props) {
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

  const activeRoutes = useMemo(() => {
    type Segment = {
      key: string;
      color: string;
      dashArray?: string;
      positions: [number, number][];
      label: string;
    };
    const segs: Segment[] = [];
    for (const s of shipments) {
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
        });
      }
      if (s.status === "flagged") {
        segs.push({
          key: `${s.shipmentId}:flagged`,
          color: "#dc2626",
          dashArray: "4 8",
          positions: pts,
          label: `${s.shipmentId} · flagged`,
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
          }}
        />
      ))}
      {nodes.map((n) => (
        <Marker key={n.nodeId} position={[n.lat, n.lng]} icon={iconFor(n)}>
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
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default NetworkMap;
