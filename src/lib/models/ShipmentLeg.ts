import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

import { LEG_STATUSES, type LegStatus } from "@/lib/constants";

const { Schema, model, models } = mongoose;

export { LEG_STATUSES, type LegStatus };

export interface IShipmentLeg {
  shipmentId: string;
  index: number;
  fromNodeId: string;
  toNodeId: string;
  driverDeviceId?: string;
  status: LegStatus;
  startedAt?: Date;
  completedAt?: Date;
  transferEventId?: string;
  solanaSignature?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ShipmentLegDoc = HydratedDocument<IShipmentLeg>;

const ShipmentLegSchema = new Schema<IShipmentLeg>(
  {
    shipmentId: { type: String, required: true, index: true },
    index: { type: Number, required: true },
    fromNodeId: { type: String, required: true },
    toNodeId: { type: String, required: true },
    driverDeviceId: { type: String, index: true, sparse: true },
    status: { type: String, enum: LEG_STATUSES, default: "pending", required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    transferEventId: { type: String },
    solanaSignature: { type: String },
  },
  { timestamps: true },
);

ShipmentLegSchema.index({ shipmentId: 1, index: 1 }, { unique: true });

export const ShipmentLeg: Model<IShipmentLeg> =
  (models.ShipmentLeg as Model<IShipmentLeg>) ??
  model<IShipmentLeg>("ShipmentLeg", ShipmentLegSchema);
