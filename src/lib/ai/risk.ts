import type { ShipmentJSON, TransferEventJSON } from "@/lib/types";

export type RiskSignal = {
  stalledShipments: ShipmentJSON[];
  anomalousEvents: TransferEventJSON[];
  affectedShipmentIds: string[];
  confidence: number;
  severity: "info" | "warning" | "critical";
  summary: string;
};

const MIDWEST_KEYWORDS = [
  "chicago",
  "midwest",
  "illinois",
  "wisconsin",
  "michigan",
  "minnesota",
  "ohio",
  "iowa",
  "nebraska",
  "kansas",
  "missouri",
  "indiana",
  "dakota",
];

export function computeRiskSignals(params: {
  shipments: ShipmentJSON[];
  events: TransferEventJSON[];
  regionQuery?: string;
}): RiskSignal {
  const regionQuery = params.regionQuery?.toLowerCase() ?? "";
  const filteredShipments =
    regionQuery && MIDWEST_KEYWORDS.some((keyword) => regionQuery.includes(keyword))
      ? params.shipments.filter((shipment) =>
          [shipment.originNodeId, shipment.finalDestinationNodeId, ...shipment.nodeRoute]
            .join(" ")
            .toLowerCase()
            .includes("mw"),
        )
      : params.shipments;

  const stalledShipments = filteredShipments.filter((shipment) => {
    const minutes = (Date.now() - new Date(shipment.lastUpdated).getTime()) / 60_000;
    return shipment.status === "in_transit" && minutes > 120;
  });
  const anomalousEvents = params.events.filter((event) => event.isAnomaly);
  const affectedShipmentIds = [...new Set([
    ...stalledShipments.map((shipment) => shipment.shipmentId),
    ...anomalousEvents.map((event) => event.shipmentId),
  ])];

  const severity =
    stalledShipments.length > 2 || anomalousEvents.length > 3
      ? "critical"
      : stalledShipments.length > 0 || anomalousEvents.length > 0
        ? "warning"
        : "info";
  const confidence =
    stalledShipments.length > 0 || anomalousEvents.length > 0 ? 0.78 : 0.92;

  const summary =
    severity === "info"
      ? "No immediate shipment risk detected from deterministic rules."
      : `${affectedShipmentIds.length} shipments need review based on stale movement and anomaly density.`;

  return {
    stalledShipments,
    anomalousEvents,
    affectedShipmentIds,
    confidence,
    severity,
    summary,
  };
}
