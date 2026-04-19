import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { NODE_KINDS, NodeModel } from "@/lib/models/Node";
import { toNodeJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PatchNodeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  kind: z.enum(NODE_KINDS).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().max(160).nullable().optional(),
  deviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[-a-zA-Z0-9._]+$/)
    .nullable()
    .optional(),
  hasHardware: z.boolean().optional(),
  active: z.boolean().optional(),
  pendingOnboarding: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  await connectDb();
  const doc = await NodeModel.findOne({ nodeId });
  if (!doc) {
    return NextResponse.json({ error: `node ${nodeId} not found` }, { status: 404 });
  }
  return NextResponse.json({ node: toNodeJSON(doc.toObject()) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PatchNodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await connectDb();

  const node = await NodeModel.findOne({ nodeId });
  if (!node) {
    return NextResponse.json({ error: `node ${nodeId} not found` }, { status: 404 });
  }

  const patch = parsed.data;
  if (patch.name !== undefined) node.name = patch.name;
  if (patch.kind !== undefined) node.kind = patch.kind;
  if (patch.lat !== undefined) node.lat = patch.lat;
  if (patch.lng !== undefined) node.lng = patch.lng;
  if (patch.address !== undefined) node.address = patch.address ?? undefined;
  if (patch.deviceId !== undefined) {
    node.deviceId = patch.deviceId ?? undefined;
    if (patch.hasHardware === undefined) {
      node.hasHardware = Boolean(patch.deviceId);
    }
  }
  if (patch.hasHardware !== undefined) node.hasHardware = patch.hasHardware;
  if (patch.active !== undefined) node.active = patch.active;
  if (patch.pendingOnboarding !== undefined) {
    node.pendingOnboarding = patch.pendingOnboarding;
  }

  await node.save();
  return NextResponse.json({ node: toNodeJSON(node.toObject()) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  await connectDb();
  const res = await NodeModel.deleteOne({ nodeId });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: `node ${nodeId} not found` }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
