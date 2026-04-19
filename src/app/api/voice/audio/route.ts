import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
const ELEVENLABS_OUTPUT_FORMAT =
  process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_22050_32";
const VOICE_AUDIO_TOKEN = process.env.VOICE_AUDIO_TOKEN;

export async function GET(req: Request) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (VOICE_AUDIO_TOKEN && token !== VOICE_AUDIO_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const text = url.searchParams.get("text")?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }
  if (text.length > 240) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      ELEVENLABS_VOICE_ID,
    )}/stream?output_format=${encodeURIComponent(ELEVENLABS_OUTPUT_FORMAT)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
      }),
      cache: "no-store",
    },
  );

  if (!upstream.ok || !upstream.body) {
    const details = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: "ElevenLabs request failed",
        details: details || `${upstream.status} ${upstream.statusText}`,
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
