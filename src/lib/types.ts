export type Batch = {
  id: string;
  batchId: string;
  origin: string;
  intendedDestination: string;
  currentHolder: string;
  status: string;
  totalTransfers: number;
  isFlagged: boolean;
  createdAt: string;
  lastUpdated: string;
  solanaSignature?: string | null;
  solanaExplorerUrl?: string | null;
};

export type HandoffStation = {
  deviceId: string;
  displayName: string | null;
  batchId: string | null;
  from: string | null;
  to: string | null;
  configured: boolean;
  updatedAt: string | null;
};

export type TransferEvent = {
  id: string;
  batchId: string;
  from: string;
  to: string;
  timestamp: string;
  confirmed: boolean;
  deviceId: string;
  notes?: string | null;
  isAnomaly: boolean;
  anomalyReason?: string | null;
  solanaSignature?: string | null;
  solanaExplorerUrl?: string | null;
  memoPayload?: string | null;
};
