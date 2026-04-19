import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveSessionContext } from "@/lib/ai/preferences";
import { buildVoiceAlert } from "@/lib/ai/voice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().trim().min(1).max(2000),
  language: z.string().trim().min(2).max(8).optional(),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  region: z.string().trim().min(2).max(64).optional(),
  baseLanguage: z.string().trim().min(2).max(8).optional(),
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
  const voice = await buildVoiceAlert({
    text: parsed.data.text,
    language: parsed.data.language ?? session.resolvedLanguage,
    severity: parsed.data.severity,
    region: parsed.data.region ?? session.region,
    baseLanguage: parsed.data.baseLanguage,
  });

  return NextResponse.json(voice);
}
