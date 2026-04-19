import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/lib/constants";

const { Schema, model, models } = mongoose;

export { SHIPMENT_STATUSES, type ShipmentStatus };

export interface IShipment {
  shipmentId: string;
  description?: string;
  cargo?: string;
  quantity?: number;
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
  lastUpdated: Date;
  createdAt?: Date;
}

export type ShipmentDoc = HydratedDocument<IShipment>;

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentId: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    cargo: { type: String },
    quantity: { type: Number },
    originNodeId: { type: String, required: true, index: true },
    finalDestinationNodeId: { type: String, required: true, index: true },
    nodeRoute: { type: [String], default: [] },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: "created",
      required: true,
    },
    totalLegs: { type: Number, default: 0 },
    completedLegs: { type: Number, default: 0 },
    currentLegIndex: { type: Number, default: 0 },
    currentHolderNodeId: { type: String, required: true },
    progressPct: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    solanaSignatures: { type: [String], default: [] },
    lastUpdated: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export const Shipment: Model<IShipment> =
  (models.Shipment as Model<IShipment>) ??
  model<IShipment>("Shipment", ShipmentSchema);
