import { NextResponse } from "next/server";
import { z } from "zod";

import { persistLanguagePreference } from "@/lib/ai/preferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  language: z.string().trim().min(2).max(8).nullable(),
});

export async function PUT(req: Request) {
  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid body", details: body.error.flatten() },
      { status: 400 },
    );
  }

  await persistLanguagePreference(body.data.language);
  return NextResponse.json({ ok: true, language: body.data.language });
}
