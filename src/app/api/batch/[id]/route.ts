import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { flagStaleBatches } from "@/lib/transfer-logic";
import { toBatchJSON, toTransferEventJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await connectDb();
  await flagStaleBatches();

  const batch = await Batch.findOne({ batchId: id });
  if (!batch) {
    return NextResponse.json({ error: `batch ${id} not found` }, { status: 404 });
  }

  const events = await TransferEvent.find({ batchId: id }).sort({ timestamp: 1 });

  return NextResponse.json({
    batch: toBatchJSON(batch.toObject()),
    events: events.map((e) => toTransferEventJSON(e.toObject())),
  });
}
