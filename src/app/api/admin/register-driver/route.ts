import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";

/**
 * Register a new driver. Demo-mode (no auth): anyone who knows the URL can
 * add a driver. Password/email are optional since sign-in is removed — a
 * placeholder email is generated when missing so the unique index still holds.
 */
const bodySchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(120),
  driverDeviceId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[-a-zA-Z0-9._]+$/),
});

const DUMMY_PASSWORD_HASH =
  "$2a$10$noLoginNoPasswordDummyHashStringXXXXXXXXXXXXXXXXXXXXXXXX";

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
  const deviceId = parsed.data.driverDeviceId.trim();
  const email =
    parsed.data.email?.trim().toLowerCase() ??
    `driver-${deviceId.toLowerCase()}@seed.relieflink.demo`;

  try {
    const user = await UserModel.create({
      email,
      passwordHash: DUMMY_PASSWORD_HASH,
      name: parsed.data.name.trim(),
      role: "driver",
      driverDeviceId: deviceId,
    });
    return NextResponse.json(
      {
        ok: true,
        userId: user._id.toString(),
        email: user.email,
        driverDeviceId: user.driverDeviceId,
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "could not create user";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
