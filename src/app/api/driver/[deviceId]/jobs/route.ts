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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await params;
  await connectDb();

  const [selfNode, activeLeg, nextLeg] = await Promise.all([
    NodeModel.findOne({ deviceId }),
    ShipmentLeg.findOne({ driverDeviceId: deviceId, status: "in_transit" }).sort({
      index: 1,
    }),
    ShipmentLeg.findOne({ driverDeviceId: deviceId, status: "pending" }).sort({
      index: 1,
    }),
  ]);

  const leg = activeLeg ?? nextLeg ?? null;
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
        : `Leg queued: ${leg.fromNodeId} -> ${leg.toNodeId}.`,
  });
}
