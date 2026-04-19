import { Shipment, type IShipment } from "@/lib/models/Shipment";
import { ShipmentLeg, type IShipmentLeg } from "@/lib/models/ShipmentLeg";

/** No tap / no leg progress within this window → flagged. After a tap, the
 *  delivery photo deadline is `proofDueAt` (see `DELIVERY_PROOF_WINDOW_MS`), not `STALE_MS`. */
const STALE_MS = Number(process.env.STALE_MS ?? 45_000);

export type AnomalyCheck = {
  isAnomaly: boolean;
  reason?: string;
};

export function evaluateLegTap(
  shipment: Pick<IShipment, "status">,
  leg: Pick<IShipmentLeg, "status">,
): AnomalyCheck {
  if (shipment.status === "delivered") {
    return { isAnomaly: true, reason: "shipment already delivered" };
  }
  if (shipment.status === "flagged") {
    return { isAnomaly: true, reason: "shipment flagged" };
  }
  if (leg.status === "done") {
    return { isAnomaly: true, reason: "leg already completed" };
  }
  if (leg.status === "flagged") {
    return { isAnomaly: true, reason: "leg flagged" };
  }
  if (leg.status === "awaiting_proof") {
    return { isAnomaly: true, reason: "leg awaiting delivery photo" };
  }
  if (leg.status !== "in_transit") {
    return { isAnomaly: true, reason: `leg not in transit (${leg.status})` };
  }
  return { isAnomaly: false };
}

/**
 * Idempotently flag shipments that have stalled mid-route (no progress past STALE_MS
 * while still waiting on an active leg). Shipments with a leg in `awaiting_proof` are
 * skipped: the driver already tapped; only the photo window (`proofDueAt`) can expire.
 */
export async function flagStaleShipments(): Promise<number> {
  const threshold = new Date(Date.now() - STALE_MS);
  const awaitingProofShipmentIds = await ShipmentLeg.distinct("shipmentId", {
    status: "awaiting_proof",
  });
  const res = await Shipment.updateMany(
    {
      status: { $in: ["created", "in_transit"] },
      isFlagged: false,
      lastUpdated: { $lt: threshold },
      ...(awaitingProofShipmentIds.length > 0
        ? { shipmentId: { $nin: awaitingProofShipmentIds } }
        : {}),
    },
    { $set: { isFlagged: true, status: "flagged" } },
  );
  if (res.modifiedCount > 0) {
    await ShipmentLeg.updateMany(
      {
        /** Intentionally exclude `awaiting_proof` — its own 2‑minute window
         * is reconciled by `finalizeExpiredProof` in the driver jobs route. */
        status: { $in: ["pending", "in_transit"] },
        updatedAt: { $lt: threshold },
      },
      { $set: { status: "flagged" } },
    );
  }
  return res.modifiedCount;
}

export { STALE_MS };
