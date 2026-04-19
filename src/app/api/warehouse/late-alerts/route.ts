import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { NodeModel } from "@/lib/models/Node";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { toShipmentLegJSON } from "@/lib/serialize";

/** Legs inbound to this node that are > 1.5× estimated duration since start. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wid = searchParams.get("warehouseNodeId")?.trim();

  if (!wid) {
    return NextResponse.json({ error: "warehouseNodeId required." }, { status: 400 });
  }

  await connectDb();
  const node = await NodeModel.findOne({ nodeId: wid });
  if (!node) {
    return NextResponse.json({ error: "Unknown node." }, { status: 400 });
  }

  const now = Date.now();
  const legs = await ShipmentLeg.find({
    status: "in_transit",
    toNodeId: wid,
    startedAt: { $exists: true, $ne: null },
  }).lean();

  const late = legs.filter((leg) => {
    const started = leg.startedAt ? new Date(leg.startedAt).getTime() : 0;
    const etaMin = leg.estimatedDurationMinutes ?? 45;
    const thresholdMs = 1.5 * etaMin * 60 * 1000;
    return started > 0 && now > started + thresholdMs;
  });

  return NextResponse.json({
    warehouseNodeId: wid,
    alerts: late.map((l) => ({
      leg: toShipmentLegJSON(l as Parameters<typeof toShipmentLegJSON>[0]),
      startedAt: l.startedAt?.toISOString() ?? null,
      thresholdExceededAt: l.startedAt
        ? new Date(
            new Date(l.startedAt).getTime() +
              1.5 * (l.estimatedDurationMinutes ?? 45) * 60 * 1000,
          ).toISOString()
        : null,
    })),
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
