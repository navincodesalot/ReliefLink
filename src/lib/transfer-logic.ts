import { Batch, type IBatch, type BatchStatus } from "@/lib/models/Batch";

const STALE_MS = Number(process.env.STALE_MS ?? 120_000);

export type AnomalyCheck = {
  isAnomaly: boolean;
  reason?: string;
};

/**
 * Validate a proposed transfer against the current batch state.
 * Does NOT mutate the batch — caller is responsible for persisting changes.
 */
export function evaluateTransfer(
  batch: Pick<IBatch, "status" | "currentHolder">,
  next: { from: string; to: string },
): AnomalyCheck {
  if (batch.status === "delivered") {
    return { isAnomaly: true, reason: "batch already delivered" };
  }
  if (next.from !== batch.currentHolder) {
    return {
      isAnomaly: true,
      reason: `from=${next.from} but currentHolder=${batch.currentHolder}`,
    };
  }
  return { isAnomaly: false };
}

/**
 * After applying a transfer, compute the batch's new status.
 */
export function nextStatus(
  batch: Pick<IBatch, "intendedDestination">,
  next: { from: string; to: string },
  isAnomaly: boolean,
): BatchStatus {
  if (isAnomaly) return "flagged";
  if (next.to === batch.intendedDestination) return "delivered";
  return "in_transit";
}

/**
 * Idempotently flag batches that have stalled (no progress past STALE_MS).
 * Called on every read so we don't need a cron.
 */
export async function flagStaleBatches(): Promise<number> {
  const threshold = new Date(Date.now() - STALE_MS);
  const res = await Batch.updateMany(
    {
      status: { $in: ["created", "in_transit"] },
      isFlagged: false,
      lastUpdated: { $lt: threshold },
    },
    { $set: { isFlagged: true, status: "flagged" } },
  );
  return res.modifiedCount;
}

export { STALE_MS };
