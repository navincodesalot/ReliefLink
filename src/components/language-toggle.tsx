"use client";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/languages";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-sm">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{t("language")}</span>
      <select
        className="bg-transparent outline-none"
        value={language}
        onChange={(event) => void setLanguage(event.target.value)}
        aria-label={t("language")}
      >
        {LANGUAGE_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => void setLanguage("en")}
        className="h-6 px-2 text-xs"
      >
        EN
      </Button>
    </label>
  );
}
