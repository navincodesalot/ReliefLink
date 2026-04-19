import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { NodeModel } from "@/lib/models/Node";
import { Shipment } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import {
  toNodeJSON,
  toShipmentJSON,
  toShipmentLegJSON,
} from "@/lib/serialize";
import { finalizeExpiredProofLeg } from "@/lib/tap-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await params;
  await connectDb();

  /**
   * Auto-finalize any legs stuck past their photo-upload deadline. Policy:
   * flag the shipment for audit but still mark the leg delivered so the
   * driver isn't permanently blocked by a missed photo.
   */
  const expiredProofLegs = await ShipmentLeg.find({
    driverDeviceId: deviceId,
    status: "awaiting_proof",
    proofDueAt: { $lt: new Date() },
  });
  for (const leg of expiredProofLegs) {
    await finalizeExpiredProofLeg(leg);
  }

  /**
   * Keep just-completed legs around for ~60s so the driver UI can show the
   * "Leg complete" celebration and Solana anchor before flipping to "no active
   * assignment" (especially for single-leg shipments where tapping removes the
   * only in_transit leg).
   */
  const RECENT_DONE_WINDOW_MS = 60_000;
  const recentDoneSince = new Date(Date.now() - RECENT_DONE_WINDOW_MS);

  const [selfNode, awaitingProofLeg, activeLeg, nextLeg, recentDoneLeg] =
    await Promise.all([
      NodeModel.findOne({ deviceId }),
      ShipmentLeg.findOne({
        driverDeviceId: deviceId,
        status: "awaiting_proof",
      }).sort({ index: 1 }),
      ShipmentLeg.findOne({ driverDeviceId: deviceId, status: "in_transit" }).sort({
        index: 1,
      }),
      ShipmentLeg.findOne({ driverDeviceId: deviceId, status: "pending" }).sort({
        index: 1,
      }),
      ShipmentLeg.findOne({
        driverDeviceId: deviceId,
        status: "done",
        completedAt: { $gte: recentDoneSince },
      }).sort({ completedAt: -1 }),
    ]);

  const leg = awaitingProofLeg ?? activeLeg ?? nextLeg ?? recentDoneLeg ?? null;
  if (!leg) {
    return NextResponse.json({
      deviceId,
      assignedNodeId: selfNode?.nodeId ?? null,
      shipment: null,
      leg: null,
      fromNode: null,
      toNode: null,
      message: selfNode
        ? `Device ${deviceId} has no active shipment assignment.`
        : `Device ${deviceId} is not yet registered. Run the USB bridge or add it on the dashboard.`,
    });
  }

  const [shipment, fromNode, toNode] = await Promise.all([
    Shipment.findOne({ shipmentId: leg.shipmentId }),
    NodeModel.findOne({ nodeId: leg.fromNodeId }),
    NodeModel.findOne({ nodeId: leg.toNodeId }),
  ]);

  return NextResponse.json({
    deviceId,
    assignedNodeId: selfNode?.nodeId ?? null,
    shipment: shipment ? toShipmentJSON(shipment.toObject()) : null,
    leg: toShipmentLegJSON(leg.toObject()),
    fromNode: fromNode ? toNodeJSON(fromNode.toObject()) : null,
    toNode: toNode ? toNodeJSON(toNode.toObject()) : null,
    message:
      leg.status === "in_transit"
        ? `Deliver ${leg.fromNodeId} -> ${leg.toNodeId}. Tap beacon on arrival.`
        : leg.status === "awaiting_proof"
          ? `Tap confirmed at ${leg.toNodeId}. Upload a delivery photo within 2 minutes.`
          : leg.status === "done"
            ? `Leg delivered: ${leg.fromNodeId} -> ${leg.toNodeId}.`
            : `Leg queued: ${leg.fromNodeId} -> ${leg.toNodeId}.`,
  });
}
