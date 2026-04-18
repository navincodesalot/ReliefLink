import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";

export interface ITransferEvent {
  batchId: string;
  from: string;
  to: string;
  timestamp: Date;
  confirmed: boolean;
  deviceId: string;
  signature?: string;
  notes?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  solanaSignature?: string;
  memoPayload?: string;
}

export type TransferEventDoc = HydratedDocument<ITransferEvent>;

const TransferEventSchema = new Schema<ITransferEvent>(
  {
    batchId: { type: String, required: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date(), index: true },
    confirmed: { type: Boolean, default: false },
    deviceId: { type: String, required: true },
    signature: { type: String },
    notes: { type: String },
    isAnomaly: { type: Boolean, default: false },
    anomalyReason: { type: String },
    solanaSignature: { type: String },
    memoPayload: { type: String },
  },
  { timestamps: false },
);

export const TransferEvent: Model<ITransferEvent> =
  (models.TransferEvent as Model<ITransferEvent>) ??
  model<ITransferEvent>("TransferEvent", TransferEventSchema);
