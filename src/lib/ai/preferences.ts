import { cookies, headers } from "next/headers";

import type { SessionContext } from "@/lib/ai/contracts";
import { connectDb } from "@/lib/db";
import { isSupportedLanguageTag } from "@/lib/i18n/languages";
import { UserPreference } from "@/lib/models/UserPreference";

const DEFAULT_LANGUAGE = "en";
const DEFAULT_COUNTRY = "US";
const DEFAULT_REGION = "US-MIDWEST";
const BROWSER_LANGUAGE_COOKIE = "relieflink-language";
const USER_ID_COOKIE = "relieflink-user";

const REGION_LANGUAGE_MAP: Record<string, string> = {
  "US-MIDWEST": "en",
  "US-SOUTH": "en",
  "MX-NORTH": "es",
  "BR-NORTH": "pt",
  "KE-NORTH": "en",
  "IN-NORTH": "en",
  "FR-WEST": "fr",
  "DE-CENTRAL": "de",
  "SA-CENTRAL": "en",
  "UA-CENTRAL": "en",
};

function normalizeLanguage(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const first = trimmed.split(",")[0]?.trim() ?? "";
  if (!first) return null;
  if (isSupportedLanguageTag(first)) return first;
  const primary = first.split("-")[0] ?? "";
  if (primary && isSupportedLanguageTag(primary)) return primary;
  return null;
}

function inferRegion(country: string, rawRegion: string | null): string {
  if (country === "US") {
    const region = (rawRegion ?? "").toUpperCase();
    if (["IL", "IN", "IA", "KS", "MI", "MN", "MO", "ND", "NE", "OH", "SD", "WI"].includes(region)) {
      return "US-MIDWEST";
    }
    if (["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV"].includes(region)) {
      return "US-SOUTH";
    }
  }
  if (country === "KE") return "KE-NORTH";
  if (country === "MX") return "MX-NORTH";
  if (country === "BR") return "BR-NORTH";
  if (country === "IN") return "IN-NORTH";
  if (country === "FR") return "FR-WEST";
  if (country === "DE") return "DE-CENTRAL";
  if (country === "SA") return "SA-CENTRAL";
  if (country === "UA") return "UA-CENTRAL";
  return DEFAULT_REGION;
}

export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(USER_ID_COOKIE)?.value;
  if (existing) return existing;

  return "guest-session";
}

async function ensureUserIdCookie() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(USER_ID_COOKIE)?.value;
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}`;
  cookieStore.set(USER_ID_COOKIE, generated, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return generated;
}

export async function resolveSessionContext(): Promise<SessionContext> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const userId = await getOrCreateUserId();

  await connectDb();
  const prefs = await UserPreference.findOne({ userId }).lean();

  const browserOverride = normalizeLanguage(cookieStore.get(BROWSER_LANGUAGE_COOKIE)?.value);
  const browserLanguage = normalizeLanguage(headerStore.get("accept-language"));
  const country = (headerStore.get("x-vercel-ip-country") ?? DEFAULT_COUNTRY).toUpperCase();
  const rawRegion = headerStore.get("x-vercel-ip-country-region");
  const resolvedRegion = prefs?.regionOverride ?? inferRegion(country, rawRegion);

  if (prefs?.languageOverride) {
    return {
      resolvedLanguage: prefs.languageOverride,
      languageSource: "user_override",
      region: resolvedRegion,
      country,
      browserLanguage,
      userOverride: prefs.languageOverride,
    };
  }

  if (browserOverride) {
    return {
      resolvedLanguage: browserOverride,
      languageSource: "browser_override",
      region: resolvedRegion,
      country,
      browserLanguage,
      userOverride: null,
    };
  }

  if (browserLanguage) {
    return {
      resolvedLanguage: browserLanguage,
      languageSource: "browser",
      region: resolvedRegion,
      country,
      browserLanguage,
      userOverride: null,
    };
  }

  return {
    resolvedLanguage: REGION_LANGUAGE_MAP[resolvedRegion] ?? DEFAULT_LANGUAGE,
    languageSource: "geo_default",
    region: resolvedRegion,
    country,
    browserLanguage,
    userOverride: null,
  };
}

export async function persistLanguagePreference(language: string | null) {
  const cookieStore = await cookies();
  const userId = await ensureUserIdCookie();

  cookieStore.set(BROWSER_LANGUAGE_COOKIE, language ?? "", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await connectDb();
  await UserPreference.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        languageOverride: language,
      },
      $setOnInsert: {
        voiceEnabled: true,
      },
    },
    { upsert: true, new: true },
  );
}
