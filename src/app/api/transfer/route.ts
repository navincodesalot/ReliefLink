import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { verifyTransferAuth } from "@/lib/auth";
import { verifyTransferPin } from "@/lib/pin";
import { evaluateTransfer, nextStatus } from "@/lib/transfer-logic";
import { buildMemoPayload, submitMemo } from "@/lib/solana-memo";
import { toBatchJSON, toTransferEventJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TransferSchema = z.object({
  batchId: z.string().min(1).max(64),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  deviceId: z.string().min(1).max(64),
  /** Two-button PIN: string of `1` and `2` (e.g. `121212`). Required when `TRANSFER_PIN` is set. */
  pin: z.string().regex(/^[12]{1,32}$/).optional(),
  notes: z.string().max(280).optional(),
});

export async function POST(req: Request) {
  const rawBody = await req.text();

  const auth = verifyTransferAuth(req.headers, rawBody);
  if (!auth.ok) {
    return NextResponse.json({ error: `unauthorized: ${auth.reason}` }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = TransferSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const payload = parsed.data;

  const pinCheck = verifyTransferPin(payload.pin);
  if (!pinCheck.ok) {
    return NextResponse.json({ error: pinCheck.message }, { status: 403 });
  }

  await connectDb();

  const batch = await Batch.findOne({ batchId: payload.batchId });
  if (!batch) {
    return NextResponse.json(
      { error: `batch ${payload.batchId} not found` },
      { status: 404 },
    );
  }

  const { isAnomaly, reason } = evaluateTransfer(batch, payload);
  const status = nextStatus(batch, payload, isAnomaly);
  const timestamp = new Date();

  const event = await TransferEvent.create({
    batchId: payload.batchId,
    from: payload.from,
    to: payload.to,
    deviceId: payload.deviceId,
    notes: payload.notes,
    confirmed: !isAnomaly,
    isAnomaly,
    anomalyReason: reason,
    timestamp,
  });

  batch.totalTransfers = (batch.totalTransfers ?? 0) + 1;
  batch.lastUpdated = timestamp;
  batch.status = status;
  if (isAnomaly) {
    batch.isFlagged = true;
  } else {
    batch.currentHolder = payload.to;
  }
  await batch.save();

  if (!isAnomaly) {
    const memo = buildMemoPayload({
      batchId: payload.batchId,
      from: payload.from,
      to: payload.to,
      deviceId: payload.deviceId,
      eventId: String(event._id),
      timestamp: timestamp.toISOString(),
    });
    const result = await submitMemo(memo);
    if (result.ok) {
      event.solanaSignature = result.signature;
      event.memoPayload = result.memo;
      await event.save();
      batch.solanaSignature = result.signature;
      await batch.save();
    } else {
      event.notes = [event.notes, `chain anchor failed: ${result.error}`]
        .filter(Boolean)
        .join(" | ");
      event.memoPayload = result.memo;
      await event.save();
    }
  }

  return NextResponse.json(
    {
      batch: toBatchJSON(batch.toObject()),
      event: toTransferEventJSON(event.toObject()),
    },
    { status: isAnomaly ? 202 : 201 },
  );
}
