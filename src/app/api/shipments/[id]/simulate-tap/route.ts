import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { processTap } from "@/lib/tap-handler";
import {
  toNodeJSON,
  toShipmentJSON,
  toShipmentLegJSON,
  toTransferEventJSON,
} from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SimulateTapSchema = z.object({
  legIndex: z.number().int().nonnegative(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = SimulateTapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await connectDb();

  const result = await processTap({
    source: "simulated_tap",
    shipmentId: id,
    legIndex: parsed.data.legIndex,
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
