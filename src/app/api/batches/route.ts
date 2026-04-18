import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { flagStaleBatches } from "@/lib/transfer-logic";
import { toBatchJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await connectDb();
  await flagStaleBatches();

  const batches = await Batch.find().sort({ lastUpdated: -1 }).limit(50);
  return NextResponse.json({
    batches: batches.map((b) => toBatchJSON(b.toObject())),
  });
}
