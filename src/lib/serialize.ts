import { explorerUrl } from "@/lib/solana-memo";
import type { IBatch } from "@/lib/models/Batch";
import type { ITransferEvent } from "@/lib/models/TransferEvent";

export type BatchJSON = {
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

export type TransferEventJSON = {
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

export function toBatchJSON(
  b: IBatch & { _id: unknown; createdAt?: Date },
): BatchJSON {
  const sig = b.solanaSignature ?? null;
  return {
    id: String(b._id),
    batchId: b.batchId,
    origin: b.origin,
    intendedDestination: b.intendedDestination,
    currentHolder: b.currentHolder,
    status: b.status,
    totalTransfers: b.totalTransfers ?? 0,
    isFlagged: Boolean(b.isFlagged),
    createdAt: (b.createdAt ?? new Date()).toISOString(),
    lastUpdated: (b.lastUpdated ?? new Date()).toISOString(),
    solanaSignature: sig,
    solanaExplorerUrl: sig ? explorerUrl(sig) : null,
  };
}

export function toTransferEventJSON(
  e: ITransferEvent & { _id: unknown },
): TransferEventJSON {
  const sig = e.solanaSignature ?? null;
  return {
    id: String(e._id),
    batchId: e.batchId,
    from: e.from,
    to: e.to,
    timestamp: (e.timestamp ?? new Date()).toISOString(),
    confirmed: Boolean(e.confirmed),
    deviceId: e.deviceId,
    notes: e.notes ?? null,
    isAnomaly: Boolean(e.isAnomaly),
    anomalyReason: e.anomalyReason ?? null,
    solanaSignature: sig,
    solanaExplorerUrl: sig ? explorerUrl(sig) : null,
    memoPayload: e.memoPayload ?? null,
  };
}
