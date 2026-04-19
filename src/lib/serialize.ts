import { explorerUrl } from "@/lib/solana-memo";
import type { INode } from "@/lib/models/Node";
import type { IShipment } from "@/lib/models/Shipment";
import type { IShipmentLeg } from "@/lib/models/ShipmentLeg";
import type { ITransferEvent } from "@/lib/models/TransferEvent";
import type {
  NodeJSON,
  ShipmentJSON,
  ShipmentLegJSON,
  TransferEventJSON,
} from "@/lib/types";

export function toNodeJSON(
  n: INode & { _id: unknown; createdAt?: Date; updatedAt?: Date },
): NodeJSON {
  return {
    id: String(n._id),
    nodeId: n.nodeId,
    name: n.name,
    kind: n.kind,
    lat: n.lat,
    lng: n.lng,
    address: n.address ?? null,
    deviceId: n.deviceId ?? null,
    hasHardware: Boolean(n.hasHardware),
    active: n.active !== false,
    pendingOnboarding: Boolean(n.pendingOnboarding),
    createdAt: (n.createdAt ?? new Date()).toISOString(),
    updatedAt: (n.updatedAt ?? n.createdAt ?? new Date()).toISOString(),
  };
}

export function toShipmentLegJSON(
  l: IShipmentLeg & { _id: unknown },
): ShipmentLegJSON {
  const sig = l.solanaSignature ?? null;
  return {
    id: String(l._id),
    shipmentId: l.shipmentId,
    index: l.index,
    fromNodeId: l.fromNodeId,
    toNodeId: l.toNodeId,
    driverDeviceId: l.driverDeviceId ?? null,
    estimatedDurationMinutes:
      typeof l.estimatedDurationMinutes === "number"
        ? l.estimatedDurationMinutes
        : 45,
    status: l.status,
    startedAt: l.startedAt ? l.startedAt.toISOString() : null,
    completedAt: l.completedAt ? l.completedAt.toISOString() : null,
    transferEventId: l.transferEventId ?? null,
    solanaSignature: sig,
    solanaExplorerUrl: sig ? explorerUrl(sig) : null,
    proofDueAt: l.proofDueAt ? l.proofDueAt.toISOString() : null,
    deliveryQuality: l.deliveryQuality ?? null,
    deliveryMatchesManifest:
      typeof l.deliveryMatchesManifest === "boolean"
        ? l.deliveryMatchesManifest
        : null,
    proofSkippedReason: l.proofSkippedReason ?? null,
    deliveryProofNotes: l.deliveryProofNotes ?? null,
  };
}

export function toShipmentJSON(
  s: IShipment & { _id: unknown; createdAt?: Date },
): ShipmentJSON {
  const latestSig = s.solanaSignatures?.[s.solanaSignatures.length - 1] ?? null;
  return {
    id: String(s._id),
    shipmentId: s.shipmentId,
    description: s.description ?? null,
    cargo: s.cargo ?? null,
    quantity: typeof s.quantity === "number" ? s.quantity : null,
    originNodeId: s.originNodeId,
    finalDestinationNodeId: s.finalDestinationNodeId,
    nodeRoute: s.nodeRoute ?? [],
    status: s.status,
    totalLegs: s.totalLegs ?? 0,
    completedLegs: s.completedLegs ?? 0,
    currentLegIndex: s.currentLegIndex ?? 0,
    currentHolderNodeId: s.currentHolderNodeId,
    progressPct: Math.max(0, Math.min(100, s.progressPct ?? 0)),
    isFlagged: Boolean(s.isFlagged),
    solanaSignatures: s.solanaSignatures ?? [],
    latestSolanaExplorerUrl: latestSig ? explorerUrl(latestSig) : null,
    createdAt: (s.createdAt ?? new Date()).toISOString(),
    lastUpdated: (s.lastUpdated ?? new Date()).toISOString(),
  };
}

export function toTransferEventJSON(
  e: ITransferEvent & { _id: unknown },
): TransferEventJSON {
  const sig = e.solanaSignature ?? null;
  return {
    id: String(e._id),
    shipmentId: e.shipmentId,
    legIndex: e.legIndex,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    deviceId: e.deviceId,
    source: e.source,
    timestamp: (e.timestamp ?? new Date()).toISOString(),
    confirmed: Boolean(e.confirmed),
    isAnomaly: Boolean(e.isAnomaly),
    anomalyReason: e.anomalyReason ?? null,
    solanaSignature: sig,
    solanaExplorerUrl: sig ? explorerUrl(sig) : null,
    memoPayload: e.memoPayload ?? null,
    notes: e.notes ?? null,
  };
}
