export const NODE_KINDS = ["warehouse", "store", "home", "other"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const SHIPMENT_STATUSES = [
  "created",
  "in_transit",
  "delivered",
  "flagged",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const LEG_STATUSES = [
  "pending",
  "in_transit",
  "awaiting_proof",
  "done",
  "flagged",
] as const;
export type LegStatus = (typeof LEG_STATUSES)[number];

export const DELIVERY_QUALITIES = ["good", "acceptable", "poor"] as const;
export type DeliveryQuality = (typeof DELIVERY_QUALITIES)[number];

export const PROOF_SKIPPED_REASONS = ["timeout"] as const;
export type ProofSkippedReason = (typeof PROOF_SKIPPED_REASONS)[number];

/** Window (ms) for driver to upload a delivery photo after a successful tap. */
export const DELIVERY_PROOF_WINDOW_MS = 120_000;

export const TAP_SOURCES = ["hardware_tap", "simulated_tap"] as const;
export type TapSourceLiteral = (typeof TAP_SOURCES)[number];
