import { callGemini } from "@/lib/ai/gemini";
import type { VoiceRequest } from "@/lib/ai/contracts";

type VoiceProfile = {
  id: string;
  language: string;
  region: string;
  urgency: "info" | "warning" | "critical";
  speed: number;
  stability: number;
  similarityBoost: number;
};

const VOICE_MATRIX: VoiceProfile[] = [
  {
    id: "en_us_normal_1",
    language: "en",
    region: "US",
    urgency: "info",
    speed: 1,
    stability: 0.65,
    similarityBoost: 0.8,
  },
  {
    id: "en_us_warning_1",
    language: "en",
    region: "US",
    urgency: "warning",
    speed: 0.95,
    stability: 0.72,
    similarityBoost: 0.83,
  },
  {
    id: "en_us_critical_1",
    language: "en",
    region: "US",
    urgency: "critical",
    speed: 0.88,
    stability: 0.82,
    similarityBoost: 0.86,
  },
  {
    id: "sw_ke_critical_1",
    language: "sw",
    region: "KE",
    urgency: "critical",
    speed: 0.82,
    stability: 0.84,
    similarityBoost: 0.86,
  },
  {
    id: "es_mx_warning_1",
    language: "es",
    region: "MX",
    urgency: "warning",
    speed: 0.94,
    stability: 0.74,
    similarityBoost: 0.82,
  },
  {
    id: "fr_fr_warning_1",
    language: "fr",
    region: "FR",
    urgency: "warning",
    speed: 0.94,
    stability: 0.74,
    similarityBoost: 0.82,
  },
  {
    id: "pt_br_warning_1",
    language: "pt",
    region: "BR",
    urgency: "warning",
    speed: 0.93,
    stability: 0.74,
    similarityBoost: 0.83,
  },
  {
    id: "de_de_warning_1",
    language: "de",
    region: "DE",
    urgency: "warning",
    speed: 0.93,
    stability: 0.74,
    similarityBoost: 0.83,
  },
  {
    id: "hi_in_warning_1",
    language: "hi",
    region: "IN",
    urgency: "warning",
    speed: 0.9,
    stability: 0.78,
    similarityBoost: 0.84,
  },
  {
    id: "ar_sa_critical_1",
    language: "ar",
    region: "SA",
    urgency: "critical",
    speed: 0.84,
    stability: 0.84,
    similarityBoost: 0.87,
  },
  {
    id: "uk_ua_warning_1",
    language: "uk",
    region: "UA",
    urgency: "warning",
    speed: 0.92,
    stability: 0.76,
    similarityBoost: 0.83,
  },
];

function regionCountry(region: string) {
  return region.split("-")[0] ?? "US";
}

function selectVoice(
  language: string,
  region: string,
  severity: VoiceRequest["severity"],
) {
  const country = regionCountry(region);
  return (
    VOICE_MATRIX.find(
      (voice) =>
        voice.language === language &&
        voice.region === country &&
        voice.urgency === severity,
    ) ??
    VOICE_MATRIX.find(
      (voice) => voice.language === language && voice.urgency === severity,
    ) ??
    VOICE_MATRIX[0]!
  );
}

export async function buildVoiceAlert(input: VoiceRequest) {
  let script = input.text;

  if (input.baseLanguage && input.baseLanguage !== input.language) {
    const translated = await callGemini({
      prompt: input.text,
      language: input.language,
      task: "translate",
    });
    if (translated.mode === "final_response") {
      script = translated.response.text;
    }
  }

  if (script.length > 180 || input.severity === "critical") {
    const voiced = await callGemini({
      prompt: script,
      language: input.language,
      task: "voice_script",
      severity: input.severity,
    });
    if (voiced.mode === "final_response" && voiced.response.voiceScript) {
      script = voiced.response.voiceScript;
    }
  }

  const voice = selectVoice(input.language, input.region, input.severity);
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceMonkeyApiKey = process.env.VOICE_MONKEY_API_KEY?.trim();
  const voiceMonkeyDevice = process.env.VOICE_MONKEY_DEVICE?.trim();
  const iftttWebhookKey = process.env.IFTTT_WEBHOOK_KEY?.trim();
  const iftttEvent = process.env.IFTTT_EVENT_NAME?.trim() || "relieflink_alert";
  const echo =
    voiceMonkeyApiKey && voiceMonkeyDevice
      ? {
          provider: "voicemonkey" as const,
          ready: true,
          message:
            "Voice Monkey command is ready for an Alexa routine or Echo device.",
          command: {
            method: "POST" as const,
            url: "https://api.voicemonkey.io/trigger",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              access_token: voiceMonkeyApiKey,
              device: voiceMonkeyDevice,
              announcement: script,
            },
          },
        }
      : iftttWebhookKey
        ? {
            provider: "ifttt" as const,
            ready: true,
            message:
              "IFTTT webhook command is ready to trigger an Alexa-connected applet.",
            command: {
              method: "POST" as const,
              url: `https://maker.ifttt.com/trigger/${iftttEvent}/json/with/key/${iftttWebhookKey}`,
              headers: {
                "Content-Type": "application/json",
              },
              body: {
                value1: script,
                value2: input.language,
                value3: input.region,
              },
            },
          }
        : {
            provider: "voicemonkey" as const,
            ready: false,
            message:
              "Echo is not connected yet. Configure VOICE_MONKEY_API_KEY and VOICE_MONKEY_DEVICE, or IFTTT_WEBHOOK_KEY, to send Alexa announcements.",
            command: null,
          };

  if (!apiKey) {
    return {
      script,
      provider: "elevenlabs" as const,
      voiceId: voice.id,
      audioUrl: null,
      echo,
    };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          model_id:
            process.env.ELEVENLABS_MODEL?.trim() || "eleven_multilingual_v2",
          text: script,
          voice_settings: {
            stability: voice.stability,
            similarity_boost: voice.similarityBoost,
            speed: voice.speed,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs HTTP ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      script,
      provider: "elevenlabs" as const,
      voiceId: voice.id,
      audioUrl: `data:audio/mpeg;base64,${bytes.toString("base64")}`,
      echo,
    };
  } catch {
    return {
      script,
      provider: "elevenlabs" as const,
      voiceId: voice.id,
      audioUrl: null,
      echo,
    };
  }
}
