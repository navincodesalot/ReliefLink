import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { DriverLocationModel } from "@/lib/models/DriverLocation";
import { UserModel } from "@/lib/models/User";

const bodySchema = z.object({
  deviceId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[-a-zA-Z0-9._]+$/),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracyM: z.number().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
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

  await DriverLocationModel.findOneAndUpdate(
    { deviceId: parsed.data.deviceId },
    {
      deviceId: parsed.data.deviceId,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      accuracyM: parsed.data.accuracyM,
      updatedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
