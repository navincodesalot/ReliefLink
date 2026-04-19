import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { FoodInventoryModel } from "@/lib/models/FoodInventory";
import { NodeModel } from "@/lib/models/Node";

const lineSchema = z.object({
  item: z.string().min(1).max(200),
  quantity: z.number().nonnegative(),
  unit: z.string().max(32).optional(),
});

const putSchema = z.object({
  warehouseNodeId: z.string().min(1).max(120),
  need: z.array(lineSchema).max(200).optional(),
  want: z.array(lineSchema).max(200).optional(),
  have: z.array(lineSchema).max(200).optional(),
});

export async function GET(req: Request) {
  await connectDb();
  const { searchParams } = new URL(req.url);
  const wid = searchParams.get("warehouseNodeId")?.trim();

  if (!wid) {
    const all = await FoodInventoryModel.find({}).lean().exec();
    return NextResponse.json({ entries: all });
  }

  const doc = await FoodInventoryModel.findOne({ warehouseNodeId: wid });
  if (!doc) {
    return NextResponse.json({
      need: [],
      want: [],
      have: [],
      warehouseNodeId: wid,
      updatedAt: null,
    });
  }

  return NextResponse.json({
    need: doc.need,
    want: doc.want,
    have: doc.have,
    warehouseNodeId: doc.warehouseNodeId,
    updatedAt: doc.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();
  const node = await NodeModel.findOne({ nodeId: parsed.data.warehouseNodeId });
  if (!node || node.kind !== "warehouse") {
    return NextResponse.json(
      { error: "warehouseNodeId must reference an existing warehouse node." },
      { status: 400 },
    );
  }

  const doc = await FoodInventoryModel.findOneAndUpdate(
    { warehouseNodeId: parsed.data.warehouseNodeId },
    {
      warehouseNodeId: parsed.data.warehouseNodeId,
      need: parsed.data.need ?? [],
      want: parsed.data.want ?? [],
      have: parsed.data.have ?? [],
      updatedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({
    ok: true,
    need: doc.need,
    want: doc.want,
    have: doc.have,
    updatedAt: doc.updatedAt?.toISOString() ?? null,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
