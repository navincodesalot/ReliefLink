import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";

export const BATCH_STATUSES = [
  "created",
  "in_transit",
  "delivered",
  "flagged",
] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export interface IBatch {
  batchId: string;
  origin: string;
  intendedDestination: string;
  currentHolder: string;
  status: BatchStatus;
  totalTransfers: number;
  isFlagged: boolean;
  lastUpdated: Date;
  createdAt: Date;
  solanaSignature?: string;
}

export type BatchDoc = HydratedDocument<IBatch>;

const BatchSchema = new Schema<IBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    origin: { type: String, required: true },
    intendedDestination: { type: String, required: true },
    currentHolder: { type: String, required: true },
    status: {
      type: String,
      enum: BATCH_STATUSES,
      default: "created",
      required: true,
    },
    totalTransfers: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: () => new Date() },
    solanaSignature: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export const Batch: Model<IBatch> =
  (models.Batch as Model<IBatch>) ?? model<IBatch>("Batch", BatchSchema);
