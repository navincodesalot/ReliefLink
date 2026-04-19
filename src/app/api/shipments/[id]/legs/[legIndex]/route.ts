import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { toShipmentLegJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PatchLegSchema = z.object({
  driverDeviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[-a-zA-Z0-9._]+$/)
    .nullable()
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; legIndex: string }> },
) {
  const { id, legIndex: legIndexRaw } = await params;
  const legIndex = Number(legIndexRaw);
  if (!Number.isInteger(legIndex) || legIndex < 0) {
    return NextResponse.json({ error: "invalid legIndex" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PatchLegSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await connectDb();

  const leg = await ShipmentLeg.findOne({ shipmentId: id, index: legIndex });
  if (!leg) {
    return NextResponse.json(
      { error: `leg ${legIndex} on ${id} not found` },
      { status: 404 },
    );
  }

  if (parsed.data.driverDeviceId !== undefined) {
    leg.driverDeviceId = parsed.data.driverDeviceId ?? undefined;
  }
  await leg.save();

  return NextResponse.json({ leg: toShipmentLegJSON(leg.toObject()) });
}
