import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveSessionContext } from "@/lib/ai/preferences";
import { handleAiQuery } from "@/lib/ai/router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await resolveSessionContext();
  const result = await handleAiQuery({
    prompt: parsed.data.prompt,
    session,
  });

  return NextResponse.json(result);
}
