import { NextResponse } from "next/server";

import { resolveSessionContext } from "@/lib/ai/preferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await resolveSessionContext();
  return NextResponse.json(session);
}
