import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyReliefLinkSecret } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { NodeModel } from "@/lib/models/Node";
import { toNodeJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RegisterSchema = z.object({
  deviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[-a-zA-Z0-9._]+$/),
  displayName: z.string().max(80).optional(),
});

/**
 * USB bridge calls this on startup. If the `deviceId` is not yet bound to a
 * Node, we create a placeholder pending node so the admin can "Promote" it on
 * the map. If it is bound, we just acknowledge.
 */
export async function POST(req: Request) {
  const auth = verifyReliefLinkSecret(req.headers);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await connectDb();

  const existing = await NodeModel.findOne({ deviceId: parsed.data.deviceId });
  if (existing) {
    return NextResponse.json({
      status: "known",
      node: toNodeJSON(existing.toObject()),
    });
  }

  const nodeId = `pending-${parsed.data.deviceId.slice(0, 32)}`;
  const dupe = await NodeModel.findOne({ nodeId });
  if (dupe) {
    return NextResponse.json({
      status: "pending",
      node: toNodeJSON(dupe.toObject()),
    });
  }

  const placeholder = await NodeModel.create({
    nodeId,
    name: parsed.data.displayName ?? `Unassigned ${parsed.data.deviceId}`,
    kind: "store",
    lat: 0,
    lng: 0,
    deviceId: parsed.data.deviceId,
    hasHardware: true,
    active: false,
    pendingOnboarding: true,
  });

  return NextResponse.json(
    { status: "pending", node: toNodeJSON(placeholder.toObject()) },
    { status: 201 },
  );
}
