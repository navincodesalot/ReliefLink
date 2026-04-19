import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { EmergencyModel } from "@/lib/models/Emergency";

const patchSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]).optional(),
  resolution: z.string().max(8000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();
  const doc = await EmergencyModel.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (parsed.data.status === "acknowledged") {
    doc.status = "acknowledged";
  }
  if (parsed.data.status === "resolved") {
    doc.status = "resolved";
    doc.resolvedAt = new Date();
  }
  if (parsed.data.resolution !== undefined) {
    doc.resolution = parsed.data.resolution;
  }

  await doc.save();
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
