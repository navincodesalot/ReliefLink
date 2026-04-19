"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export function AdminDashboardHeader() {
  const { t } = useLanguage();

  return (
    <header className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("unOperations")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("adminConsoleTitle")}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("adminConsoleDesc")}</p>
        <p className="text-muted-foreground text-xs">
          {t("adminSignedIn")}{" "}
          <Link href="/" className="text-primary hover:underline">
            {t("navHome")}
          </Link>
        </p>
      </div>
      <AdminLogoutButton />
    </header>
  );
}
