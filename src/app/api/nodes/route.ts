import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { NODE_KINDS, NodeModel } from "@/lib/models/Node";
import { toNodeJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateNodeSchema = z.object({
  nodeId: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[-a-zA-Z0-9._]+$/)
    .optional(),
  name: z.string().min(1).max(80),
  kind: z.enum(NODE_KINDS).default("store"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(160).optional(),
  deviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[-a-zA-Z0-9._]+$/)
    .optional(),
  hasHardware: z.boolean().optional(),
});

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export async function GET() {
  await connectDb();
  const rows = await NodeModel.find().sort({ createdAt: 1 });
  return NextResponse.json({
    nodes: rows.map((n) => toNodeJSON(n.toObject())),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = CreateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  await connectDb();

  const candidate =
    input.nodeId ?? `${slug(input.name) || "node"}-${Date.now().toString(36).slice(-5)}`;

  const existing = await NodeModel.findOne({ nodeId: candidate });
  if (existing) {
    return NextResponse.json(
      { error: `node ${candidate} already exists` },
      { status: 409 },
    );
  }

  const hasHardware = input.hasHardware ?? Boolean(input.deviceId);

  const node = await NodeModel.create({
    nodeId: candidate,
    name: input.name,
    kind: input.kind,
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    deviceId: input.deviceId,
    hasHardware,
    active: true,
    pendingOnboarding: false,
  });

  return NextResponse.json({ node: toNodeJSON(node.toObject()) }, { status: 201 });
}
