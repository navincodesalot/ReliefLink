import { Shipment, type IShipment } from "@/lib/models/Shipment";
import { ShipmentLeg, type IShipmentLeg } from "@/lib/models/ShipmentLeg";

const STALE_MS = Number(process.env.STALE_MS ?? 120_000);

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
  return { isAnomaly: false };
}

/**
 * Idempotently flag shipments that have stalled mid-route (no progress past STALE_MS).
 * Called on every list read so we don't need a cron.
 */
export async function flagStaleShipments(): Promise<number> {
  const threshold = new Date(Date.now() - STALE_MS);
  const res = await Shipment.updateMany(
    {
      status: { $in: ["created", "in_transit"] },
      isFlagged: false,
      lastUpdated: { $lt: threshold },
    },
    { $set: { isFlagged: true, status: "flagged" } },
  );
  if (res.modifiedCount > 0) {
    await ShipmentLeg.updateMany(
      {
        status: { $in: ["pending", "in_transit"] },
        updatedAt: { $lt: threshold },
      },
      { $set: { status: "flagged" } },
    );
  }
  return res.modifiedCount;
}

export { STALE_MS };
