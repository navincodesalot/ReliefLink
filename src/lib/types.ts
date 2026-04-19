import type {
  LegStatus,
  NodeKind,
  ShipmentStatus,
  TapSourceLiteral,
} from "@/lib/constants";

export type NodeJSON = {
  id: string;
  nodeId: string;
  name: string;
  kind: NodeKind;
  lat: number;
  lng: number;
  address: string | null;
  deviceId: string | null;
  hasHardware: boolean;
  active: boolean;
  pendingOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentLegJSON = {
  id: string;
  shipmentId: string;
  index: number;
  fromNodeId: string;
  toNodeId: string;
  driverDeviceId: string | null;
  status: LegStatus;
  startedAt: string | null;
  completedAt: string | null;
  transferEventId: string | null;
  solanaSignature: string | null;
  solanaExplorerUrl: string | null;
};

export type ShipmentJSON = {
  id: string;
  shipmentId: string;
  description: string | null;
  cargo: string | null;
  quantity: number | null;
  originNodeId: string;
  finalDestinationNodeId: string;
  nodeRoute: string[];
  status: ShipmentStatus;
  totalLegs: number;
  completedLegs: number;
  currentLegIndex: number;
  currentHolderNodeId: string;
  progressPct: number;
  isFlagged: boolean;
  solanaSignatures: string[];
  latestSolanaExplorerUrl: string | null;
  createdAt: string;
  lastUpdated: string;
};

export type TransferEventJSON = {
  id: string;
  shipmentId: string;
  legIndex: number;
  fromNodeId: string;
  toNodeId: string;
  deviceId: string;
  source: TapSourceLiteral;
  timestamp: string;
  confirmed: boolean;
  isAnomaly: boolean;
  anomalyReason: string | null;
  solanaSignature: string | null;
  solanaExplorerUrl: string | null;
  memoPayload: string | null;
  notes: string | null;
};

export type DriverJobJSON = {
  deviceId: string;
  assignedNodeId: string | null;
  shipment: ShipmentJSON | null;
  leg: ShipmentLegJSON | null;
  fromNode: NodeJSON | null;
  toNode: NodeJSON | null;
  message: string;
};
