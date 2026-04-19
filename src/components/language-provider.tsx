"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SessionContext } from "@/lib/ai/contracts";
import { DICTS, EN_DICT } from "@/lib/i18n/bundles";
import { DRIVER_OVERRIDES } from "@/lib/i18n/driver-overrides";
import { isSupportedLanguageTag } from "@/lib/i18n/languages";

type LanguageContextValue = SessionContext & {
  language: string;
  setLanguage: (language: string) => Promise<void>;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialSession,
  children,
}: {
  initialSession: SessionContext;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState(initialSession.resolvedLanguage);

  useEffect(() => {
    const local = window.localStorage.getItem("relieflink.language");
    if (local && local !== language && isSupportedLanguageTag(local)) {
      setLanguageState(local);
    }
  }, [language]);

  const setLanguage = useCallback(async (nextLanguage: string) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("relieflink.language", nextLanguage);
    await fetch("/api/user/preferences/language", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: nextLanguage }),
    });
  }, []);

  useEffect(() => {
    if (!isSupportedLanguageTag(language)) {
      void setLanguage("en");
    }
  }, [language, setLanguage]);

  const value = useMemo<LanguageContextValue>(() => {
    const base = DICTS[language] ?? EN_DICT;
    const extra = DRIVER_OVERRIDES[language];
    const dict = extra ? { ...base, ...extra } : base;
    return {
      ...initialSession,
      resolvedLanguage: language,
      language,
      setLanguage,
      t: (key) => dict[key] ?? EN_DICT[key] ?? key,
    };
  }, [initialSession, language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return value;
}
