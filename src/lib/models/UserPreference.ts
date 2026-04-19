import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

const { Schema, model, models } = mongoose;

export interface IUserPreference {
  userId: string;
  languageOverride?: string | null;
  regionOverride?: string | null;
  voiceEnabled: boolean;
  preferredVoiceId?: string | null;
  updatedAt?: Date;
  createdAt?: Date;
}

export type UserPreferenceDoc = HydratedDocument<IUserPreference>;

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    languageOverride: { type: String, default: null },
    regionOverride: { type: String, default: null },
    voiceEnabled: { type: Boolean, default: true },
    preferredVoiceId: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserPreference: Model<IUserPreference> =
  (models.UserPreference as Model<IUserPreference>) ??
  model<IUserPreference>("UserPreference", UserPreferenceSchema);
