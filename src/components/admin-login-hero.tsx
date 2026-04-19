"use client";

import { useLanguage } from "@/components/language-provider";

export function AdminLoginHero() {
  const { t } = useLanguage();

  return (
    <header className="space-y-2 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("unOperations")}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("adminLoginTitle")}</h1>
      <p className="text-muted-foreground text-sm">{t("adminLoginBlurb")}</p>
    </header>
  );
}
