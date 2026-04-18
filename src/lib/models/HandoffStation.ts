import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";

export interface IHandoffStation {
  deviceId: string;
  displayName?: string;
  batchId?: string;
  from?: string;
  to?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type HandoffStationDoc = HydratedDocument<IHandoffStation>;

const HandoffStationSchema = new Schema<IHandoffStation>(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String },
    batchId: { type: String },
    from: { type: String },
    to: { type: String },
  },
  { timestamps: true },
);

export const HandoffStation: Model<IHandoffStation> =
  (models.HandoffStation as Model<IHandoffStation>) ??
  model<IHandoffStation>("HandoffStation", HandoffStationSchema);
