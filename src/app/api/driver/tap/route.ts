import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { processTap } from "@/lib/tap-handler";
import {
  toNodeJSON,
  toShipmentJSON,
  toShipmentLegJSON,
  toTransferEventJSON,
} from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  deviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[-a-zA-Z0-9._]+$/),
});

/**
 * Driver tap: validates deviceId belongs to a registered driver user, then
 * processes the next leg handoff. No session cookies — drivers are picked in
 * the UI from `GET /api/drivers` and the chosen deviceId is sent in the body.
 */
export async function POST(req: Request) {
  let json: unknown = {};
  try {
    const text = await req.text();
    if (text) json = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();
  const deviceId = parsed.data.deviceId.trim();

  const driver = await UserModel.findOne({ role: "driver", driverDeviceId: deviceId });
  if (!driver) {
    return NextResponse.json(
      { error: "Unknown driver device. Ask an admin to register it." },
      { status: 404 },
    );
  }

  const result = await processTap({
    source: "hardware_tap",
    deviceId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      shipment: toShipmentJSON(result.shipment.toObject()),
      leg: toShipmentLegJSON(result.leg.toObject()),
      event: toTransferEventJSON(result.event.toObject()),
      fromNode: result.fromNode ? toNodeJSON(result.fromNode.toObject()) : null,
      toNode: result.toNode ? toNodeJSON(result.toNode.toObject()) : null,
    },
    { status: result.event.isAnomaly ? 202 : 201 },
  );
}
