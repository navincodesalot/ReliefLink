import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

import {
  DELIVERY_QUALITIES,
  LEG_STATUSES,
  PROOF_SKIPPED_REASONS,
  type DeliveryQuality,
  type LegStatus,
  type ProofSkippedReason,
} from "@/lib/constants";

const { Schema, model, models } = mongoose;

export { LEG_STATUSES, type LegStatus };

export interface IShipmentLeg {
  shipmentId: string;
  index: number;
  fromNodeId: string;
  toNodeId: string;
  driverDeviceId?: string;
  status: LegStatus;
  /** ETA baseline for late detection (minutes). */
  estimatedDurationMinutes: number;
  startedAt?: Date;
  completedAt?: Date;
  transferEventId?: string;
  solanaSignature?: string;
  /** Deadline by which the driver must upload a delivery photo after tap. */
  proofDueAt?: Date;
  /** AI-assessed quality of the delivered goods; null if the timeout path was used. */
  deliveryQuality?: DeliveryQuality;
  /** Why proof was skipped (e.g. `"timeout"`); used for audit. */
  proofSkippedReason?: ProofSkippedReason;
  /** AI rationale stored for admin audit. */
  deliveryProofNotes?: string;
  /** Whether the AI said the image matches the shipment manifest. */
  deliveryMatchesManifest?: boolean;
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
    estimatedDurationMinutes: { type: Number, default: 45, min: 1 },
    status: { type: String, enum: LEG_STATUSES, default: "pending", required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    transferEventId: { type: String },
    solanaSignature: { type: String },
    proofDueAt: { type: Date },
    deliveryQuality: { type: String, enum: DELIVERY_QUALITIES },
    proofSkippedReason: { type: String, enum: PROOF_SKIPPED_REASONS },
    deliveryProofNotes: { type: String },
    deliveryMatchesManifest: { type: Boolean },
  },
  { timestamps: true },
);

ShipmentLegSchema.index({ shipmentId: 1, index: 1 }, { unique: true });

export const ShipmentLeg: Model<IShipmentLeg> =
  (models.ShipmentLeg as Model<IShipmentLeg>) ??
  model<IShipmentLeg>("ShipmentLeg", ShipmentLegSchema);
