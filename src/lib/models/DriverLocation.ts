import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

const { Schema, model, models } = mongoose;

export interface IDriverLocation {
  deviceId: string;
  lat: number;
  lng: number;
  accuracyM?: number;
  updatedAt?: Date;
}

export type DriverLocationDoc = HydratedDocument<IDriverLocation>;

const DriverLocationSchema = new Schema<IDriverLocation>(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracyM: { type: Number },
  },
  { timestamps: { createdAt: false, updatedAt: "updatedAt" } },
);

export const DriverLocationModel: Model<IDriverLocation> =
  (models.DriverLocation as Model<IDriverLocation>) ??
  model<IDriverLocation>("DriverLocation", DriverLocationSchema);
