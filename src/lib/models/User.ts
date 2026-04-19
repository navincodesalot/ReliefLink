import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

import type { StaffRole } from "@/lib/roles";

const { Schema, model, models } = mongoose;

export interface IUser {
  email: string;
  passwordHash: string;
  role: StaffRole;
  name: string;
  /** Driver portal: device id bound to this account */
  driverDeviceId?: string;
  /** Warehouse portal: primary node this food bank operates */
  warehouseNodeId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDoc = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "warehouse", "driver"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    driverDeviceId: { type: String, index: true, sparse: true },
    warehouseNodeId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

export const UserModel: Model<IUser> =
  (models.User as Model<IUser>) ?? model<IUser>("User", UserSchema);
