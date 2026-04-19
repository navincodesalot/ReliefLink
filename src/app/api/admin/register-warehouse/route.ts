import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/require-admin";
import { connectDb } from "@/lib/db";
import { NodeModel } from "@/lib/models/Node";
import { UserModel } from "@/lib/models/User";

/**
 * Register a warehouse account. Requires an authenticated admin session cookie.
 * Email/password are optional for seeded demo users.
 */
const bodySchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(120),
  warehouseNodeId: z.string().min(1).max(120),
});

const DUMMY_PASSWORD_HASH =
  "$2a$10$noLoginNoPasswordDummyHashStringXXXXXXXXXXXXXXXXXXXXXXXX";

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

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
  const node = await NodeModel.findOne({ nodeId: parsed.data.warehouseNodeId });
  if (!node || node.kind !== "warehouse") {
    return NextResponse.json(
      { error: "warehouseNodeId must reference an existing warehouse node." },
      { status: 400 },
    );
  }

  const email =
    parsed.data.email?.trim().toLowerCase() ??
    `warehouse-${parsed.data.warehouseNodeId.toLowerCase()}@seed.relieflink.demo`;

  try {
    const user = await UserModel.create({
      email,
      passwordHash: DUMMY_PASSWORD_HASH,
      name: parsed.data.name.trim(),
      role: "warehouse",
      warehouseNodeId: parsed.data.warehouseNodeId.trim(),
    });
    return NextResponse.json(
      {
        ok: true,
        userId: user._id.toString(),
        email: user.email,
        warehouseNodeId: user.warehouseNodeId,
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
