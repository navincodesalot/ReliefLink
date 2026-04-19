/**
 * Server-side helpers for the Echo / Alexa announcements used on the
 * warehouse floor. Two flavours:
 *
 *   1. `getEchoAnnouncementCommand` — returns a serialisable description
 *      of the HTTP call that can be sent back to a client (used by the
 *      AI Voice API response).
 *   2. `fireEchoAnnouncement` — kicks off the same call on the server in
 *      the background. Never throws, never blocks the caller.
 *
 * Supports Voice Monkey first, then IFTTT Webhooks as a fallback.
 *
 * Voice Monkey v2 (current): spoken announcements use
 * `POST https://api-v2.voicemonkey.io/announcement` with JSON fields
 * `token`, `device`, and `text`. The older `api.voicemonkey.io` URL and
 * `access_token` / `announcement` body keys are obsolete — `/trigger` only
 * fires a routine (no TTS text).
 */

/** Voice Monkey Announcement API base (see https://voicemonkey.io/docs). */
const VOICE_MONKEY_API_BASE = "https://api-v2.voicemonkey.io";

export type EchoCommand = {
  method: "POST";
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
};

export type EchoConfig =
  | {
      provider: "voicemonkey";
      ready: true;
      message: string;
      command: EchoCommand;
    }
  | {
      provider: "ifttt";
      ready: true;
      message: string;
      command: EchoCommand;
    }
  | {
      provider: "voicemonkey";
      ready: false;
      message: string;
      command: null;
    };

type AnnouncementMeta = {
  language?: string;
  region?: string;
};

export function getEchoAnnouncementCommand(
  script: string,
  meta?: AnnouncementMeta,
): EchoConfig {
  const voiceMonkeyApiKey = process.env.VOICE_MONKEY_API_KEY?.trim();
  const voiceMonkeyDevice = process.env.VOICE_MONKEY_DEVICE?.trim();
  const iftttWebhookKey = process.env.IFTTT_WEBHOOK_KEY?.trim();
  const iftttEvent =
    process.env.IFTTT_EVENT_NAME?.trim() || "relieflink_alert";

  if (voiceMonkeyApiKey && voiceMonkeyDevice) {
    const body: Record<string, unknown> = {
      token: voiceMonkeyApiKey,
      device: voiceMonkeyDevice,
      text: script,
      /** Echo Show: hide Voice Monkey logo. Does not affect “Someone is at…” (see .env.example). */
      no_bg: "true",
    };
    if (meta?.language) body.language = meta.language;

    return {
      provider: "voicemonkey",
      ready: true,
      message:
        "Voice Monkey Announcement API is ready (POST /announcement on api-v2).",
      command: {
        method: "POST",
        url: `${VOICE_MONKEY_API_BASE}/announcement`,
        headers: { "Content-Type": "application/json" },
        body,
      },
    };
  }

  if (iftttWebhookKey) {
    return {
      provider: "ifttt",
      ready: true,
      message:
        "IFTTT webhook command is ready to trigger an Alexa-connected applet.",
      command: {
        method: "POST",
        url: `https://maker.ifttt.com/trigger/${iftttEvent}/json/with/key/${iftttWebhookKey}`,
        headers: { "Content-Type": "application/json" },
        body: {
          value1: script,
          value2: meta?.language ?? "en",
          value3: meta?.region ?? "",
        },
      },
    };
  }

  return {
    provider: "voicemonkey",
    ready: false,
    message:
      "Echo is not connected yet. Configure VOICE_MONKEY_API_KEY and VOICE_MONKEY_DEVICE, or IFTTT_WEBHOOK_KEY, to send Alexa announcements.",
    command: null,
  };
}

/**
 * Sends the announcement and **awaits** the HTTP response. Serverless runtimes
 * (e.g. Vercel) often freeze the isolate right after the route returns; a
 * fire-and-forget `fetch` can be dropped, which is why dispatch sometimes
 * worked but tap/proof did not. Callers should `await` this before returning
 * JSON when delivery must be reliable.
 */
export async function fireEchoAnnouncement(
  script: string,
  meta?: AnnouncementMeta,
): Promise<void> {
  const trimmed = script.trim();
  if (!trimmed) return;

  const cfg = getEchoAnnouncementCommand(trimmed, meta);
  if (!cfg.ready || !cfg.command) {
    console.info(
      "[echo-voice] skipped — set VOICE_MONKEY_API_KEY + VOICE_MONKEY_DEVICE, or IFTTT_WEBHOOK_KEY, to hear Alexa announcements.",
    );
    return;
  }

  const { url, method, headers, body } = cfg.command;
  const provider = cfg.provider;
  const preview =
    trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
  console.info(`[echo-voice] sending via ${provider}: ${preview}`);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      console.info(`[echo-voice] ${provider} request succeeded (HTTP ${res.status})`);
      return;
    }
    const errText = await res.text().catch(() => "");
    console.warn(
      `[echo-voice] ${provider} HTTP ${res.status}${errText ? `: ${errText.slice(0, 500)}` : ""}`,
    );
  } catch (err) {
    console.warn(`[echo-voice] ${provider} request failed`, err);
  }
}
