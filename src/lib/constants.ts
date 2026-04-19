export const NODE_KINDS = ["warehouse", "store", "home", "other"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const SHIPMENT_STATUSES = [
  "created",
  "in_transit",
  "delivered",
  "flagged",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const LEG_STATUSES = ["pending", "in_transit", "done", "flagged"] as const;
export type LegStatus = (typeof LEG_STATUSES)[number];

export const TAP_SOURCES = ["hardware_tap", "simulated_tap"] as const;
export type TapSourceLiteral = (typeof TAP_SOURCES)[number];
