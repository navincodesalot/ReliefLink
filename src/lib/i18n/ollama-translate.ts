const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";

function ollamaBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, "") : DEFAULT_OLLAMA_URL;
}

function ollamaModel(): string {
  const raw = process.env.OLLAMA_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_MODEL;
}

function languageLabel(tag: string): string {
  const map: Record<string, string> = {
    en: "English",
    de: "German",
    fr: "French",
    pt: "Portuguese",
    zh: "Chinese (Simplified)",
    cs: "Czech",
    fil: "Filipino",
    sk: "Slovak",
    es: "Spanish",
    sv: "Swedish",
  };
  return map[tag] ?? tag;
}

/**
 * Translates a short English line for AI summaries when the session locale is not
 * covered by static UI strings (edge case). Requires a running Ollama instance if used.
 */
export async function translateTextOllama(
  text: string,
  targetLanguageTag: string,
): Promise<string | null> {
  if (!text.trim()) return text;
  const label = languageLabel(targetLanguageTag);

  const body = {
    model: ollamaModel(),
    messages: [
      {
        role: "user" as const,
        content: `Translate the following English text into ${label} (language tag ${targetLanguageTag}). Reply with the translation only, no quotes or explanation.

${text}`,
      },
    ],
    stream: false,
  };

  try {
    const res = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      message?: { content?: string };
    };
    const out = data.message?.content?.trim();
    return out && out.length > 0 ? out : null;
  } catch {
    return null;
  }
}
