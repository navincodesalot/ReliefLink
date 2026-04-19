import { NodeModel, type NodeDoc } from "@/lib/models/Node";
import { Shipment, type ShipmentDoc } from "@/lib/models/Shipment";
import { ShipmentLeg, type ShipmentLegDoc } from "@/lib/models/ShipmentLeg";
import { TransferEvent, type TransferEventDoc } from "@/lib/models/TransferEvent";
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
    const leg = await ShipmentLeg.findOne({
      driverDeviceId: input.deviceId,
      status: "in_transit",
    }).sort({ index: 1 });
    if (!leg) {
      return {
        ok: false,
        status: 404,
        error: `no active leg assigned to device ${input.deviceId}`,
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

  leg.status = "done";
  leg.completedAt = timestamp;
  leg.transferEventId = String(event._id);

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
  shipment.status = isFinal ? "delivered" : "in_transit";

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
    }
  }
  await shipment.save();

  const [fromNode, toNode] = await Promise.all([
    NodeModel.findOne({ nodeId: leg.fromNodeId }),
    NodeModel.findOne({ nodeId: leg.toNodeId }),
  ]);

  return { ok: true, shipment, leg, event, fromNode, toNode };
}
