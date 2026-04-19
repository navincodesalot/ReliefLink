"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";

export function AdminLoginBackLink() {
  const { t } = useLanguage();
  return (
    <p className="text-muted-foreground text-center text-xs">
      <Link href="/" className="text-primary hover:underline">
        {t("backToHome")}
      </Link>
    </p>
  );
}
