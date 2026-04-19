/**
 * Warehouse / store floor announcements. These run on the server and
 * push a short spoken line to the configured Alexa Echo device via
 * Voice Monkey or IFTTT.
 *
 * Three events today:
 *   - `announceInboundLeg`  : a leg just became `in_transit` with a driver
 *   - `announceDriverVerified` : hardware tap confirmed a driver at the dock
 *   - `announceProofOutcome`   : AI photo verdict came back
 */

import { fireEchoAnnouncement } from "@/lib/echo-voice";
import type { DeliveryQuality } from "@/lib/constants";
import { NodeModel } from "@/lib/models/Node";
import type { ShipmentDoc } from "@/lib/models/Shipment";
import type { ShipmentLegDoc } from "@/lib/models/ShipmentLeg";
import { UserModel } from "@/lib/models/User";

function safeCall<T>(run: () => Promise<T>): Promise<T | null> {
  return run().catch(() => null);
}

async function resolveDriverLabel(driverDeviceId?: string): Promise<string> {
  if (!driverDeviceId) return "an unassigned driver";
  const user = await safeCall(() =>
    UserModel.findOne({ role: "driver", driverDeviceId }),
  );
  if (user?.name) return user.name;
  const tail = driverDeviceId.split(/[-._]/).pop();
  return tail ? `driver ${tail}` : "the driver";
}

async function resolveNodeLabel(nodeId?: string): Promise<string | null> {
  if (!nodeId) return null;
  const node = await safeCall(() => NodeModel.findOne({ nodeId }));
  return node?.name ?? nodeId;
}

/** Human-friendly description of what is on the truck. */
function cargoLine(shipment: ShipmentDoc): string {
  const item = shipment.cargo?.trim() || shipment.description?.trim();
  if (typeof shipment.quantity === "number" && shipment.quantity > 0 && item) {
    return `${shipment.quantity} ${item}`;
  }
  if (item) return item;
  return `shipment ${shipment.shipmentId}`;
}

/**
 * Announces that a delivery is on its way, including cargo, quantity,
 * driver name and (when known) the destination node name.
 */
export async function announceInboundLeg(args: {
  shipment: ShipmentDoc;
  leg: ShipmentLegDoc;
}): Promise<void> {
  const { shipment, leg } = args;
  if (!leg.driverDeviceId) return;

  const [driver, destination] = await Promise.all([
    resolveDriverLabel(leg.driverDeviceId),
    resolveNodeLabel(leg.toNodeId),
  ]);

  const load = cargoLine(shipment);
  const destPart = destination ? ` to ${destination}` : "";
  const script = `Incoming delivery${destPart}. ${driver} is bringing ${load}.`;

  fireEchoAnnouncement(script);
}

/** Called after a successful hardware tap at the destination dock. */
export async function announceDriverVerified(args: {
  leg: ShipmentLegDoc;
}): Promise<void> {
  const driver = await resolveDriverLabel(args.leg.driverDeviceId);
  const script = `${driver} is verified. Please hand over the shipment.`;
  fireEchoAnnouncement(script);
}

/**
 * Spoken summary of the delivery photo verdict. Branches on `flagged` so
 * the tone matches the audit record written by the delivery-proof route.
 */
export async function announceProofOutcome(args: {
  shipment: ShipmentDoc;
  leg: ShipmentLegDoc;
  verdict: {
    matchesManifest: boolean;
    quality: DeliveryQuality;
    rationale?: string;
  };
  flagged: boolean;
}): Promise<void> {
  const { shipment, verdict, flagged } = args;
  const load = cargoLine(shipment);

  let script: string;
  if (!flagged && verdict.quality === "good" && verdict.matchesManifest) {
    script = `Delivery confirmed. ${load} arrived in good condition.`;
  } else if (flagged) {
    const issues: string[] = [];
    if (verdict.quality === "poor") {
      issues.push("the goods appear to be in poor condition");
    }
    if (!verdict.matchesManifest) {
      issues.push("the load does not match the manifest");
    }
    const detail = issues.length
      ? issues.join(" and ")
      : "the shipment needs a closer look";
    script = `Heads up. Delivery for ${load} has been flagged: ${detail}. Please check with the driver.`;
  } else {
    script = `Delivery accepted with a note. ${load} arrived, but the goods are acceptable rather than pristine.`;
  }

  fireEchoAnnouncement(script);
}
