import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { DriverLocationModel } from "@/lib/models/DriverLocation";

export async function GET() {
  await connectDb();
  const locs = await DriverLocationModel.find({}).lean().exec();
  return NextResponse.json({
    locations: locs.map((l) => ({
      deviceId: l.deviceId,
      lat: l.lat,
      lng: l.lng,
      accuracyM: l.accuracyM ?? null,
      updatedAt: l.updatedAt?.toISOString() ?? null,
    })),
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
