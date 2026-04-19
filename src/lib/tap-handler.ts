import { DELIVERY_PROOF_WINDOW_MS, type DeliveryQuality, type ProofSkippedReason } from "@/lib/constants";
import { NodeModel, type NodeDoc } from "@/lib/models/Node";
import { Shipment, type ShipmentDoc } from "@/lib/models/Shipment";
import { ShipmentLeg, type ShipmentLegDoc } from "@/lib/models/ShipmentLeg";
import { TransferEvent, type TransferEventDoc } from "@/lib/models/TransferEvent";
import { announceDriverVerified, announceInboundLeg } from "@/lib/store-voice";
import { evaluateLegTap } from "@/lib/transfer-logic";
import { buildMemoPayload, submitMemo } from "@/lib/solana-memo";

export type TapSource = "hardware_tap" | "simulated_tap";

export type TapInput =
  | { source: "hardware_tap"; deviceId: string }
  | { source: "simulated_tap"; shipmentId: string; legIndex: number; deviceId?: string };

export type TapResult =
  | {
      ok: true;
      shipment: ShipmentDoc;
      leg: ShipmentLegDoc;
      event: TransferEventDoc;
      fromNode: NodeDoc | null;
      toNode: NodeDoc | null;
    }
  | { ok: false; status: number; error: string };

async function resolveContext(
  input: TapInput,
): Promise<
  | { ok: true; shipment: ShipmentDoc; leg: ShipmentLegDoc; deviceId: string }
  | { ok: false; status: number; error: string }
> {
  if (input.source === "hardware_tap") {
    let leg = await ShipmentLeg.findOne({
      driverDeviceId: input.deviceId,
      status: "in_transit",
    }).sort({ index: 1 });

    /** USB store beacon: EEPROM id matches destination node's deviceId */
    if (!leg) {
      const dest = await NodeModel.findOne({ deviceId: input.deviceId });
      if (dest) {
        leg = await ShipmentLeg.findOne({
          toNodeId: dest.nodeId,
          status: "in_transit",
        }).sort({ index: 1 });
      }
    }

    if (!leg) {
      return {
        ok: false,
        status: 404,
        error: `no active leg for device ${input.deviceId} (driver or destination node)`,
      };
    }
    const shipment = await Shipment.findOne({ shipmentId: leg.shipmentId });
    if (!shipment) {
      return { ok: false, status: 404, error: "shipment missing for leg" };
    }
    return { ok: true, shipment, leg, deviceId: input.deviceId };
  }

  const shipment = await Shipment.findOne({ shipmentId: input.shipmentId });
  if (!shipment) {
    return { ok: false, status: 404, error: `shipment ${input.shipmentId} not found` };
  }
  const leg = await ShipmentLeg.findOne({
    shipmentId: input.shipmentId,
    index: input.legIndex,
  });
  if (!leg) {
    return {
      ok: false,
      status: 404,
      error: `leg ${input.legIndex} not found on shipment ${input.shipmentId}`,
    };
  }
  const deviceId = input.deviceId ?? leg.driverDeviceId ?? "admin-sim";
  return { ok: true, shipment, leg, deviceId };
}

export async function processTap(input: TapInput): Promise<TapResult> {
  const ctx = await resolveContext(input);
  if (!ctx.ok) return ctx;

  const { shipment, leg, deviceId } = ctx;
  const { isAnomaly, reason } = evaluateLegTap(shipment, leg);
  const timestamp = new Date();

  const event = await TransferEvent.create({
    shipmentId: shipment.shipmentId,
    legIndex: leg.index,
    fromNodeId: leg.fromNodeId,
    toNodeId: leg.toNodeId,
    deviceId,
    source: input.source,
    timestamp,
    confirmed: !isAnomaly,
    isAnomaly,
    anomalyReason: reason,
  });

  if (isAnomaly) {
    leg.status = "flagged";
    await leg.save();
    shipment.isFlagged = true;
    shipment.status = "flagged";
    shipment.lastUpdated = timestamp;
    await shipment.save();
    const [fromNode, toNode] = await Promise.all([
      NodeModel.findOne({ nodeId: leg.fromNodeId }),
      NodeModel.findOne({ nodeId: leg.toNodeId }),
    ]);
    return { ok: true, shipment, leg, event, fromNode, toNode };
  }

  /**
   * Hardware taps now require a delivery photo before the leg is marked
   * `done` and anchored on Solana. Simulated taps (dashboard testing) keep
   * the legacy immediate-finalize behaviour so admins can complete flows
   * without standing up the driver PWA.
   */
  if (input.source === "hardware_tap") {
    leg.status = "awaiting_proof";
    leg.proofDueAt = new Date(timestamp.getTime() + DELIVERY_PROOF_WINDOW_MS);
    leg.transferEventId = String(event._id);
    await leg.save();

    shipment.lastUpdated = timestamp;
    await shipment.save();

    const [fromNode, toNode] = await Promise.all([
      NodeModel.findOne({ nodeId: leg.fromNodeId }),
      NodeModel.findOne({ nodeId: leg.toNodeId }),
    ]);

    await announceDriverVerified({ leg }).catch((err) => {
      console.warn("[tap-handler] driver-verified announcement failed", err);
    });

    return { ok: true, shipment, leg, event, fromNode, toNode };
  }

  const finalized = await finalizeLegAfterProof({
    shipment,
    leg,
    event,
    deviceId,
    timestamp,
  });
  return finalized;
}

/**
 * If a leg is stuck in `awaiting_proof` past its deadline, finalize it with
 * `flagShipment: true` and `proofSkippedReason: "timeout"`. Safe to call on
 * any leg — returns `null` if no action was needed.
 */
export async function finalizeExpiredProofLeg(
  leg: ShipmentLegDoc,
): Promise<TapResult | null> {
  if (leg.status !== "awaiting_proof") return null;
  if (!leg.proofDueAt || leg.proofDueAt.getTime() > Date.now()) return null;

  const shipment = await Shipment.findOne({ shipmentId: leg.shipmentId });
  if (!shipment) return null;

  const event = leg.transferEventId
    ? await TransferEvent.findById(leg.transferEventId)
    : null;
  if (!event) return null;

  return finalizeLegAfterProof({
    shipment,
    leg,
    event,
    deviceId: event.deviceId,
    flagShipment: true,
    proofSkippedReason: "timeout",
    proofNotes: "Delivery photo not uploaded within 2-minute window",
  });
}

export type FinalizeProofInput = {
  shipment: ShipmentDoc;
  leg: ShipmentLegDoc;
  event: TransferEventDoc;
  deviceId: string;
  timestamp?: Date;
  deliveryQuality?: DeliveryQuality;
  matchesManifest?: boolean;
  proofSkippedReason?: ProofSkippedReason;
  proofNotes?: string;
  /** Force-flag the shipment for audit (e.g. poor quality, mismatch, timeout). */
  flagShipment?: boolean;
};

/**
 * Anchors the leg on Solana and advances the shipment. Shared by the
 * delivery-proof API and the timeout path in the driver jobs route.
 * Idempotent — re-running on an already-`done` leg returns the existing state.
 */
export async function finalizeLegAfterProof(
  input: FinalizeProofInput,
): Promise<TapResult> {
  const { shipment, leg, event, deviceId } = input;
  const timestamp = input.timestamp ?? new Date();

  if (leg.status === "done") {
    const [fromNode, toNode] = await Promise.all([
      NodeModel.findOne({ nodeId: leg.fromNodeId }),
      NodeModel.findOne({ nodeId: leg.toNodeId }),
    ]);
    return { ok: true, shipment, leg, event, fromNode, toNode };
  }

  leg.status = "done";
  leg.completedAt = timestamp;
  if (!leg.transferEventId) leg.transferEventId = String(event._id);
  if (input.deliveryQuality) leg.deliveryQuality = input.deliveryQuality;
  if (typeof input.matchesManifest === "boolean") {
    leg.deliveryMatchesManifest = input.matchesManifest;
  }
  if (input.proofSkippedReason) leg.proofSkippedReason = input.proofSkippedReason;
  if (input.proofNotes) leg.deliveryProofNotes = input.proofNotes;

  const memo = buildMemoPayload({
    shipmentId: shipment.shipmentId,
    legIndex: leg.index,
    fromNodeId: leg.fromNodeId,
    toNodeId: leg.toNodeId,
    deviceId,
    eventId: String(event._id),
    timestamp: timestamp.toISOString(),
  });
  const chain = await submitMemo(memo);
  if (chain.ok) {
    event.solanaSignature = chain.signature;
    event.memoPayload = chain.memo;
    leg.solanaSignature = chain.signature;
    shipment.solanaSignatures = [
      ...(shipment.solanaSignatures ?? []),
      chain.signature,
    ];
  } else {
    event.memoPayload = chain.memo;
    event.notes = `chain anchor failed: ${chain.error}`;
  }
  if (input.proofNotes) {
    event.notes = event.notes
      ? `${event.notes}; ${input.proofNotes}`
      : input.proofNotes;
  }
  await event.save();
  await leg.save();

  const completedLegs = (shipment.completedLegs ?? 0) + 1;
  const totalLegs = shipment.totalLegs || completedLegs;
  const progressPct = Math.round((completedLegs / totalLegs) * 100);
  const isFinal = completedLegs >= totalLegs;

  shipment.completedLegs = completedLegs;
  shipment.progressPct = progressPct;
  shipment.currentHolderNodeId = leg.toNodeId;
  shipment.lastUpdated = timestamp;
  if (input.flagShipment) shipment.isFlagged = true;
  shipment.status = shipment.isFlagged
    ? "flagged"
    : isFinal
      ? "delivered"
      : "in_transit";

  let nextLegForAnnouncement: ShipmentLegDoc | null = null;
  if (!isFinal) {
    const nextIndex = leg.index + 1;
    const nextLeg = await ShipmentLeg.findOne({
      shipmentId: shipment.shipmentId,
      index: nextIndex,
    });
    if (nextLeg) {
      nextLeg.status = "in_transit";
      if (!nextLeg.startedAt) nextLeg.startedAt = timestamp;
      await nextLeg.save();
      shipment.currentLegIndex = nextIndex;
      if (nextLeg.driverDeviceId) nextLegForAnnouncement = nextLeg;
    }
  }
  await shipment.save();

  if (nextLegForAnnouncement) {
    await announceInboundLeg({
      shipment,
      leg: nextLegForAnnouncement,
    }).catch((err) => {
      console.warn("[tap-handler] next-leg announcement failed", err);
    });
  }

  const [fromNode, toNode] = await Promise.all([
    NodeModel.findOne({ nodeId: leg.fromNodeId }),
    NodeModel.findOne({ nodeId: leg.toNodeId }),
  ]);

  return { ok: true, shipment, leg, event, fromNode, toNode };
}
