"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";

export function NodesPageIntro() {
  const { t } = useLanguage();

  return (
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("nodesEyebrow")}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {t("nodesTitle")}
      </h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        {t("nodesDescBefore")}{" "}
        <Link href="/admin" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("nodesDescLink")}
        </Link>
        {t("nodesDescAfter")}
      </p>
    </header>
  );
}
