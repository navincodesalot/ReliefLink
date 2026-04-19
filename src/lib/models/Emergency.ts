import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

const { Schema, model, models } = mongoose;

export type EmergencyStatus = "open" | "acknowledged" | "resolved";

export interface IEmergency {
  deviceId: string;
  driverUserId?: string;
  message: string;
  status: EmergencyStatus;
  /** Admin notes / resolution */
  resolution?: string;
  resolvedByUserId?: string;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EmergencyDoc = HydratedDocument<IEmergency>;

const EmergencySchema = new Schema<IEmergency>(
  {
    deviceId: { type: String, required: true, index: true },
    driverUserId: { type: String, index: true, sparse: true },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      default: "open",
      index: true,
    },
    resolution: { type: String, trim: true, maxlength: 8000 },
    resolvedByUserId: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

export const EmergencyModel: Model<IEmergency> =
  (models.Emergency as Model<IEmergency>) ??
  model<IEmergency>("Emergency", EmergencySchema);
