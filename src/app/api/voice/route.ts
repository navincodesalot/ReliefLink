import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { verifyTransferPin } from "@/lib/pin";
import { evaluateTransfer, nextStatus } from "@/lib/transfer-logic";
import { buildMemoPayload, submitMemo } from "@/lib/solana-memo";
import { toBatchJSON, toTransferEventJSON } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Voice webhook for Amazon Alexa Routines, IFTTT, Voice Monkey, etc.
 *
 * Usage: create an Alexa Routine "When I say: ReliefLink confirm warehouse" that
 * triggers a custom action / webhook POSTing to this endpoint. It uses a simple
 * shared-secret query param to keep the contract copy-pasteable into GUIs that
 * cannot set signed headers.
 *
 * Body schema:
 *   { batchId, from, to, deviceId?, pin? }
 */

const VoiceSchema = z.object({
  batchId: z.string().min(1).max(64),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  deviceId: z.string().min(1).max(64).optional(),
  pin: z.string().regex(/^[12]{1,32}$/).optional(),
});

export async function POST(req: Request) {
  const secret = process.env.TRANSFER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server missing TRANSFER_SECRET" }, { status: 500 });
  }

  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get("token");
  const tokenFromHeader = req.headers.get("x-relieflink-secret");
  if (tokenFromQuery !== secret && tokenFromHeader !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = VoiceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const payload = { ...parsed.data, deviceId: parsed.data.deviceId ?? "alexa-echo-dot" };

  const pinCheck = verifyTransferPin(payload.pin);
  if (!pinCheck.ok) {
    return NextResponse.json(
      { error: pinCheck.message, speak: "Invalid PIN." },
      { status: 403 },
    );
  }

  await connectDb();

  const batch = await Batch.findOne({ batchId: payload.batchId });
  if (!batch) {
    return NextResponse.json({ error: `batch ${payload.batchId} not found` }, { status: 404 });
  }

  const { isAnomaly, reason } = evaluateTransfer(batch, payload);
  const status = nextStatus(batch, payload, isAnomaly);
  const timestamp = new Date();

  const event = await TransferEvent.create({
    batchId: payload.batchId,
    from: payload.from,
    to: payload.to,
    deviceId: payload.deviceId,
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
    }
  }

  // Voice-friendly response — Alexa Routines that read webhook output can
  // surface this text through TTS.
  return NextResponse.json({
    speak: isAnomaly
      ? `Transfer flagged. Reason: ${reason}`
      : `Transfer confirmed. Batch ${payload.batchId} now held by ${payload.to}.`,
    batch: toBatchJSON(batch.toObject()),
    event: toTransferEventJSON(event.toObject()),
  });
}
