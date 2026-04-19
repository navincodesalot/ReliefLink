import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await connectDb();
  const drivers = await UserModel.find({ role: "driver" })
    .select({ name: 1, email: 1, driverDeviceId: 1 })
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    drivers: drivers
      .filter((d) => d.driverDeviceId)
      .map((d) => ({
        driverDeviceId: d.driverDeviceId!,
        name: d.name,
        email: d.email,
      })),
  });
}
