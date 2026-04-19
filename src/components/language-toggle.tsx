"use client";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  /** Compact control for the site header (next to theme toggle). */
  variant?: "default" | "header";
};

export function LanguageToggle({ variant = "default" }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();
  const selectValue = LANGUAGE_OPTIONS.some(([code]) => code === language)
    ? language
    : "en";

  const isHeader = variant === "header";

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background shadow-sm",
        isHeader ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
      )}
    >
      <Globe
        className={cn("shrink-0 text-muted-foreground", isHeader ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden
      />
      {!isHeader ? (
        <span className="text-muted-foreground">{t("language")}</span>
      ) : null}
      <select
        className={cn(
          "max-w-[min(11rem,42vw)] bg-transparent outline-none",
          isHeader && "text-xs",
        )}
        value={selectValue}
        onChange={(event) => void setLanguage(event.target.value)}
        aria-label={t("language")}
        title={t("language")}
      >
        {LANGUAGE_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {!isHeader ? (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => void setLanguage("en")}
          className="h-6 px-2 text-xs"
        >
          EN
        </Button>
      ) : null}
    </label>
  );
}
