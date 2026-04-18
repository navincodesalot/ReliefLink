import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { toBatchJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateBatchSchema = z.object({
  batchId: z.string().min(1).max(64),
  origin: z.string().min(1).max(64),
  intendedDestination: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = CreateBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await connectDb();

  const existing = await Batch.findOne({ batchId: parsed.data.batchId });
  if (existing) {
    return NextResponse.json(
      { error: `batch ${parsed.data.batchId} already exists` },
      { status: 409 },
    );
  }

  const now = new Date();
  const batch = await Batch.create({
    batchId: parsed.data.batchId,
    origin: parsed.data.origin,
    intendedDestination: parsed.data.intendedDestination,
    currentHolder: parsed.data.origin,
    status: "created",
    totalTransfers: 0,
    isFlagged: false,
    lastUpdated: now,
  });

  return NextResponse.json({ batch: toBatchJSON(batch.toObject()) }, { status: 201 });
}
