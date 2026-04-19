import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { HardwareRegistrationModel } from "@/lib/models/HardwareRegistration";

const bodySchema = z.object({
  deviceId: z.string().min(1).max(120).regex(/^[-a-zA-Z0-9._]+$/),
  kind: z.enum(["arduino_driver", "store_beacon"]),
  label: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
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
  try {
    const doc = await HardwareRegistrationModel.create({
      ...parsed.data,
      registeredByUserId: null,
    });
    return NextResponse.json({ ok: true, id: doc._id.toString() }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "duplicate or invalid";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
