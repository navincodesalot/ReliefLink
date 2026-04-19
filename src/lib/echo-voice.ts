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
 */

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
    return {
      provider: "voicemonkey",
      ready: true,
      message:
        "Voice Monkey command is ready for an Alexa routine or Echo device.",
      command: {
        method: "POST",
        url: "https://api.voicemonkey.io/trigger",
        headers: { "Content-Type": "application/json" },
        body: {
          access_token: voiceMonkeyApiKey,
          device: voiceMonkeyDevice,
          announcement: script,
        },
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
 * Fire-and-forget Echo announcement. Safe to call from any request handler:
 * the HTTP call runs in the background and errors are swallowed (logged).
 */
export function fireEchoAnnouncement(
  script: string,
  meta?: AnnouncementMeta,
): void {
  const trimmed = script.trim();
  if (!trimmed) return;

  const cfg = getEchoAnnouncementCommand(trimmed, meta);
  if (!cfg.ready || !cfg.command) return;

  const { url, method, headers, body } = cfg.command;
  const provider = cfg.provider;

  void fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
    .then((res) => {
      if (!res.ok) {
        console.warn(`[echo-voice] ${provider} HTTP ${res.status}`);
      }
    })
    .catch((err) => {
      console.warn(`[echo-voice] ${provider} request failed`, err);
    });
}
