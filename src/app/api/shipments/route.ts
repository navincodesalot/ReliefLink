import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { NodeModel } from "@/lib/models/Node";
import { Shipment } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { flagStaleShipments } from "@/lib/transfer-logic";
import { toShipmentJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateShipmentSchema = z.object({
  shipmentId: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[-a-zA-Z0-9._]+$/)
    .optional(),
  description: z.string().max(200).optional(),
  cargo: z.string().max(120).optional(),
  quantity: z.number().int().nonnegative().optional(),
  originNodeId: z.string().min(1).max(48),
  finalDestinationNodeId: z.string().min(1).max(48),
  driverDeviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[-a-zA-Z0-9._]+$/)
    .optional(),
});

export async function GET() {
  await connectDb();
  await flagStaleShipments();
  const rows = await Shipment.find().sort({ lastUpdated: -1 }).limit(100);
  return NextResponse.json({
    shipments: rows.map((s) => toShipmentJSON(s.toObject())),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = CreateShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (input.originNodeId === input.finalDestinationNodeId) {
    return NextResponse.json(
      { error: "origin and destination must differ" },
      { status: 400 },
    );
  }

  await connectDb();

  const route = [input.originNodeId, input.finalDestinationNodeId];
  const unique = new Set(route);
  if (unique.size !== route.length) {
    return NextResponse.json(
      { error: "route cannot repeat a node" },
      { status: 400 },
    );
  }

  const nodes = await NodeModel.find({ nodeId: { $in: route } });
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const missing = route.filter((id) => !byId.has(id));
  if (missing.length) {
    return NextResponse.json(
      { error: `unknown nodes: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const legDefs = route.slice(0, -1).map((from, i) => ({
    from,
    to: route[i + 1]!,
    index: i,
  }));

  const hardwareLessDestinations = legDefs
    .map((l) => byId.get(l.to)!)
    .filter((n) => !n.hasHardware);
  if (hardwareLessDestinations.length) {
    return NextResponse.json(
      {
        error:
          "destination nodes must have hardware (use Simulate tap only for testing): " +
          hardwareLessDestinations.map((n) => n.nodeId).join(", "),
      },
      { status: 400 },
    );
  }

  const shipmentId =
    input.shipmentId ?? `SH-${Date.now().toString(36).toUpperCase()}`;

  const existing = await Shipment.findOne({ shipmentId });
  if (existing) {
    return NextResponse.json(
      { error: `shipment ${shipmentId} already exists` },
      { status: 409 },
    );
  }

  const now = new Date();
  const shipment = await Shipment.create({
    shipmentId,
    description: input.description,
    cargo: input.cargo,
    quantity: input.quantity,
    originNodeId: input.originNodeId,
    finalDestinationNodeId: input.finalDestinationNodeId,
    nodeRoute: route,
    status: "in_transit",
    totalLegs: legDefs.length,
    completedLegs: 0,
    currentLegIndex: 0,
    currentHolderNodeId: input.originNodeId,
    progressPct: 0,
    isFlagged: false,
    solanaSignatures: [],
    lastUpdated: now,
  });

  await ShipmentLeg.insertMany(
    legDefs.map((l) => ({
      shipmentId,
      index: l.index,
      fromNodeId: l.from,
      toNodeId: l.to,
      driverDeviceId: input.driverDeviceId,
      status: l.index === 0 ? "in_transit" : "pending",
      startedAt: l.index === 0 ? now : undefined,
    })),
  );

  return NextResponse.json(
    { shipment: toShipmentJSON(shipment.toObject()) },
    { status: 201 },
  );
}
