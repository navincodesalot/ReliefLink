import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { Shipment } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { flagStaleShipments } from "@/lib/transfer-logic";
import {
  toShipmentJSON,
  toShipmentLegJSON,
  toTransferEventJSON,
} from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await connectDb();
  await flagStaleShipments();

  const shipment = await Shipment.findOne({ shipmentId: id });
  if (!shipment) {
    return NextResponse.json(
      { error: `shipment ${id} not found` },
      { status: 404 },
    );
  }

  const [legs, events] = await Promise.all([
    ShipmentLeg.find({ shipmentId: id }).sort({ index: 1 }),
    TransferEvent.find({ shipmentId: id }).sort({ timestamp: 1 }),
  ]);

  return NextResponse.json({
    shipment: toShipmentJSON(shipment.toObject()),
    legs: legs.map((l) => toShipmentLegJSON(l.toObject())),
    events: events.map((e) => toTransferEventJSON(e.toObject())),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await connectDb();
  const res = await Shipment.deleteOne({ shipmentId: id });
  await ShipmentLeg.deleteMany({ shipmentId: id });
  await TransferEvent.deleteMany({ shipmentId: id });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: `shipment ${id} not found` }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
