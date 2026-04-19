import mongoose from "mongoose";
import type { Model, HydratedDocument } from "mongoose";

const { Schema, model, models } = mongoose;

export interface IFoodLine {
  item: string;
  quantity: number;
  unit?: string;
}

export interface IFoodInventory {
  userId?: string;
  warehouseNodeId: string;
  need: IFoodLine[];
  want: IFoodLine[];
  have: IFoodLine[];
  updatedAt?: Date;
}

export type FoodInventoryDoc = HydratedDocument<IFoodInventory>;

const LineSchema = new Schema<IFoodLine>(
  {
    item: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true },
  },
  { _id: false },
);

const FoodInventorySchema = new Schema<IFoodInventory>(
  {
    userId: { type: String, index: true },
    warehouseNodeId: { type: String, required: true, unique: true, index: true },
    need: { type: [LineSchema], default: [] },
    want: { type: [LineSchema], default: [] },
    have: { type: [LineSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: "updatedAt" } },
);

export const FoodInventoryModel: Model<IFoodInventory> =
  (models.FoodInventory as Model<IFoodInventory>) ??
  model<IFoodInventory>("FoodInventory", FoodInventorySchema);
