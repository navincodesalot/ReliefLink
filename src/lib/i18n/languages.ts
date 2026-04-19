/**
 * Supported UI locales (IETF BCP 47). All strings are in `bundles.ts` — no runtime MT.
 * Filipino uses the ISO 639-1 code `fil`.
 */
export const LANGUAGE_OPTIONS = [
  ["en", "English"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["pt", "Português"],
  ["zh", "中文（简体）"],
  ["cs", "Čeština"],
  ["fil", "Filipino"],
  ["sk", "Slovenčina"],
  ["es", "Español"],
  ["sv", "Svenska"],
] as const;

export type SupportedLanguageTag = (typeof LANGUAGE_OPTIONS)[number][0];

const TAGS = new Set<string>(LANGUAGE_OPTIONS.map(([code]) => code));

export function isSupportedLanguageTag(tag: string): tag is SupportedLanguageTag {
  return TAGS.has(tag);
}
