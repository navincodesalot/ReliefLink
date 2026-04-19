"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={async () => {
        await fetch("/api/auth/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      {t("signOut")}
    </Button>
  );
}
