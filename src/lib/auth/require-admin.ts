import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}
