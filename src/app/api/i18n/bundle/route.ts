import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupportedLanguageTag } from "@/lib/i18n/languages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  language: z.string().trim().min(2).max(12),
});

/**
 * Legacy endpoint: all UI locales are shipped in `bundles.ts`. Kept for compatibility.
 */
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { language } = parsed.data;
  if (!isSupportedLanguageTag(language)) {
    return NextResponse.json({ error: "unsupported language" }, { status: 400 });
  }

  return NextResponse.json({
    source: "static" as const,
    language,
  });
}
