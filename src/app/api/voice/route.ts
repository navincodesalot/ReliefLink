import { NextResponse } from "next/server";

import { verifyTransferAuth } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import {
  buildAlexaResponse,
  buildAudioText,
  executeVoiceCommand,
  parseVoiceCommand,
  shouldUseAlexaEnvelope,
} from "@/lib/voice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VOICE_WEBHOOK_TOKEN = process.env.VOICE_WEBHOOK_TOKEN;
const VOICE_AUDIO_TOKEN = process.env.VOICE_AUDIO_TOKEN;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

function isAuthorized(req: Request, rawBody: string) {
  const auth = verifyTransferAuth(req.headers, rawBody);
  if (auth.ok) return { ok: true as const };

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (VOICE_WEBHOOK_TOKEN && token === VOICE_WEBHOOK_TOKEN) {
    return { ok: true as const };
  }

  return auth;
}

function buildAudioUrl(req: Request, speech: string) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) return null;

  const audioText = buildAudioText(speech);
  if (!audioText) return null;

  const base = new URL(req.url);
  const audio = new URL("/api/voice/audio", base.origin);
  audio.searchParams.set("text", audioText);

  if (VOICE_AUDIO_TOKEN) {
    audio.searchParams.set("token", VOICE_AUDIO_TOKEN);
  }

  return audio.toString();
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const auth = isAuthorized(req, rawBody);
  if (!auth.ok) {
    return NextResponse.json(
      { error: `unauthorized: ${auth.reason}` },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await connectDb();

  try {
    const command = parseVoiceCommand(body);
    const result = await executeVoiceCommand(command);
    const audioUrl =
      result.ok && result.preferAudio ? buildAudioUrl(req, result.shortSpeech) : null;

    if (shouldUseAlexaEnvelope(body)) {
      return NextResponse.json(
        buildAlexaResponse({
          speech: result.speech,
          audioUrl,
        }),
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: result.ok,
        speech: result.speech,
        audioUrl,
        data: result.data ?? null,
      },
      { status: result.status ?? (result.ok ? 200 : 400) },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "voice command failed";

    if (shouldUseAlexaEnvelope(body)) {
      return NextResponse.json(
        buildAlexaResponse({
          speech: `I hit an error. ${message}`,
        }),
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
