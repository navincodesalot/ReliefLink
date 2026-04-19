import { NextResponse } from "next/server";
import { z } from "zod";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin-session";
import { sessionSecret } from "@/lib/login-validation";
import { signSessionToken } from "@/lib/session-sign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(256),
});

function adminCredentials() {
  const username = process.env.RELIEFLINK_ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.RELIEFLINK_ADMIN_PASSWORD ?? "admin";
  return { username, password };
}

export async function POST(req: Request) {
  const secret = sessionSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Server missing RELIEFLINK_SESSION_SECRET or TRANSFER_SECRET" },
      { status: 500 },
    );
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { username, password } = adminCredentials();
  const body = parsed.data;
  if (body.username !== username || body.password !== password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = signSessionToken("admin", secret, {
    email: "admin@relieflink.local",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
