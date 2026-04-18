import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyReliefLinkSecret } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { HandoffStation } from "@/lib/models/HandoffStation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const deviceIdParam = z.string().min(1).max(64).regex(/^[-a-zA-Z0-9._]+$/);

const PutBody = z.object({
  displayName: z.string().max(64).default(""),
  batchId: z.string().max(64).default(""),
  from: z.string().max(64).default(""),
  to: z.string().max(64).default(""),
});

function toPayload(doc: {
  deviceId: string;
  displayName?: string | null;
  batchId?: string | null;
  from?: string | null;
  to?: string | null;
}) {
  const batchId = doc.batchId ?? null;
  const from = doc.from ?? null;
  const to = doc.to ?? null;
  const configured = Boolean(batchId && from && to);
  return {
    deviceId: doc.deviceId,
    displayName: doc.displayName ?? null,
    batchId,
    from,
    to,
    configured,
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ deviceId: string }> }) {
  const auth = verifyReliefLinkSecret(req.headers);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { deviceId: raw } = await ctx.params;
  const parsedId = deviceIdParam.safeParse(raw);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid deviceId" }, { status: 400 });
  }
  const deviceId = parsedId.data;

  await connectDb();
  const doc = await HandoffStation.findOne({ deviceId }).lean();
  if (!doc) {
    return NextResponse.json({
      deviceId,
      displayName: null,
      batchId: null,
      from: null,
      to: null,
      configured: false,
    });
  }

  return NextResponse.json(toPayload(doc));
}

/** Open write for dashboard UX; field bridge still uses TRANSFER_SECRET on GET (this device) + POST /transfer. */
export async function PUT(req: Request, ctx: { params: Promise<{ deviceId: string }> }) {
  const { deviceId: raw } = await ctx.params;
  const parsedId = deviceIdParam.safeParse(raw);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid deviceId" }, { status: 400 });
  }
  const deviceId = parsedId.data;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const body = PutBody.safeParse(json);
  if (!body.success) {
    return NextResponse.json(
      { error: "validation", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const { displayName, batchId, from, to } = body.data;
  const dn = displayName.trim() || null;
  const bid = batchId.trim() || null;
  const fr = from.trim() || null;
  const t = to.trim() || null;

  await connectDb();

  const doc = await HandoffStation.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        deviceId,
        displayName: dn,
        batchId: bid,
        from: fr,
        to: t,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  if (!doc) {
    return NextResponse.json({ error: "persist failed" }, { status: 500 });
  }

  return NextResponse.json(toPayload(doc));
}
