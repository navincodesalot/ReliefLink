import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

const { Schema, model, models } = mongoose;

export interface ITransferEvent {
  shipmentId: string;
  legIndex: number;
  fromNodeId: string;
  toNodeId: string;
  deviceId: string;
  source: "hardware_tap" | "simulated_tap";
  timestamp: Date;
  confirmed: boolean;
  isAnomaly: boolean;
  anomalyReason?: string;
  solanaSignature?: string;
  memoPayload?: string;
  notes?: string;
}

export type TransferEventDoc = HydratedDocument<ITransferEvent>;

const TransferEventSchema = new Schema<ITransferEvent>(
  {
    shipmentId: { type: String, required: true, index: true },
    legIndex: { type: Number, required: true },
    fromNodeId: { type: String, required: true },
    toNodeId: { type: String, required: true },
    deviceId: { type: String, required: true },
    source: {
      type: String,
      enum: ["hardware_tap", "simulated_tap"],
      default: "hardware_tap",
      required: true,
    },
    timestamp: { type: Date, default: () => new Date(), index: true },
    confirmed: { type: Boolean, default: false },
    isAnomaly: { type: Boolean, default: false },
    anomalyReason: { type: String },
    solanaSignature: { type: String },
    memoPayload: { type: String },
    notes: { type: String },
  },
  { timestamps: false },
);

export const TransferEvent: Model<ITransferEvent> =
  (models.TransferEvent as Model<ITransferEvent>) ??
  model<ITransferEvent>("TransferEvent", TransferEventSchema);
