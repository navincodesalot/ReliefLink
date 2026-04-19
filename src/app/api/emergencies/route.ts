import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { EmergencyModel } from "@/lib/models/Emergency";
import { UserModel } from "@/lib/models/User";

const postSchema = z.object({
  deviceId: z.string().min(1).max(120),
  message: z.string().min(1).max(4000),
});

export async function GET() {
  await connectDb();
  const rows = await EmergencyModel.find({}).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({
    emergencies: rows.map((e) => ({
      id: String(e._id),
      deviceId: e.deviceId,
      driverUserId: e.driverUserId ?? null,
      message: e.message,
      status: e.status,
      resolution: e.resolution ?? null,
      resolvedByUserId: e.resolvedByUserId ?? null,
      resolvedAt: e.resolvedAt?.toISOString() ?? null,
      createdAt: e.createdAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();

  const driver = await UserModel.findOne({
    role: "driver",
    driverDeviceId: parsed.data.deviceId,
  });
  if (!driver) {
    return NextResponse.json({ error: "Unknown driver device." }, { status: 404 });
  }

  const doc = await EmergencyModel.create({
    deviceId: parsed.data.deviceId,
    driverUserId: driver._id.toString(),
    message: parsed.data.message.trim(),
    status: "open",
  });

  return NextResponse.json(
    { ok: true, id: doc._id.toString() },
    { status: 201 },
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
