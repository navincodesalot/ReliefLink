import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

import { NODE_KINDS, type NodeKind } from "@/lib/constants";

const { Schema, model, models } = mongoose;

export { NODE_KINDS, type NodeKind };

export interface INode {
  nodeId: string;
  name: string;
  kind: NodeKind;
  lat: number;
  lng: number;
  address?: string;
  deviceId?: string;
  hasHardware: boolean;
  active: boolean;
  pendingOnboarding: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NodeDoc = HydratedDocument<INode>;

const NodeSchema = new Schema<INode>(
  {
    nodeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    kind: { type: String, enum: NODE_KINDS, default: "store", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    deviceId: { type: String, index: true, sparse: true },
    hasHardware: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    pendingOnboarding: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const NodeModel: Model<INode> =
  (models.Node as Model<INode>) ?? model<INode>("Node", NodeSchema);
