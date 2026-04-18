import { NextResponse } from "next/server";

import { verifyReliefLinkSecret } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { HandoffStation } from "@/lib/models/HandoffStation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = verifyReliefLinkSecret(req.headers);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  await connectDb();
  const rows = await HandoffStation.find().sort({ deviceId: 1 }).lean();

  const stations = rows.map((doc) => ({
    deviceId: doc.deviceId,
    displayName: doc.displayName ?? null,
    batchId: doc.batchId ?? null,
    from: doc.from ?? null,
    to: doc.to ?? null,
    configured: Boolean(doc.batchId && doc.from && doc.to),
    updatedAt: doc.updatedAt?.toISOString?.() ?? null,
  }));

  return NextResponse.json({ stations });
}
