import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

const { Schema, model, models } = mongoose;

export type HardwareKind = "arduino_driver" | "store_beacon";

export interface IHardwareRegistration {
  deviceId: string;
  kind: HardwareKind;
  label: string;
  notes?: string;
  registeredByUserId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type HardwareRegistrationDoc = HydratedDocument<IHardwareRegistration>;

const HardwareRegistrationSchema = new Schema<IHardwareRegistration>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["arduino_driver", "store_beacon"],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    notes: { type: String },
    registeredByUserId: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

export const HardwareRegistrationModel: Model<IHardwareRegistration> =
  (models.HardwareRegistration as Model<IHardwareRegistration>) ??
  model<IHardwareRegistration>("HardwareRegistration", HardwareRegistrationSchema);
