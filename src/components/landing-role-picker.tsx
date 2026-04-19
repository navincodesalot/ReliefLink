"use client";

import Link from "next/link";
import { Boxes, Eye, Shield, Truck } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { PageBackdrop } from "@/components/page-backdrop";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLE_KEYS = [
  {
    href: "/admin/login",
    titleKey: "roleAdminTitle" as const,
    descKey: "roleAdminDesc" as const,
    ctaKey: "roleAdminCta" as const,
    icon: Shield,
  },
  {
    href: "/nodes",
    titleKey: "roleNodesTitle" as const,
    descKey: "roleNodesDesc" as const,
    ctaKey: "roleNodesCta" as const,
    icon: Boxes,
  },
  {
    href: "/driver",
    titleKey: "roleDriverTitle" as const,
    descKey: "roleDriverDesc" as const,
    ctaKey: "roleDriverCta" as const,
    icon: Truck,
  },
  {
    href: "/track",
    titleKey: "roleLedgerTitle" as const,
    descKey: "roleLedgerDesc" as const,
    ctaKey: "roleLedgerCta" as const,
    icon: Eye,
  },
] as const;

export function LandingRolePicker() {
  const { t } = useLanguage();

  return (
    <PageBackdrop>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <header className="space-y-4 text-center md:text-left">
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            {t("landingEyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            {t("landingTitle")}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-relaxed text-pretty md:mx-0 md:text-base">
            {t("landingSubtitle")}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {ROLE_KEYS.map(({ href, titleKey, descKey, ctaKey, icon: Icon }) => (
            <Card
              key={href}
              className="border-border/70 bg-card/70 hover:border-primary/35 flex flex-col shadow-sm backdrop-blur-md transition hover:shadow-md"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="bg-muted/50 text-foreground mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-inner">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-snug">{t(titleKey)}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {t(descKey)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="border-border/60 bg-muted/10 mt-auto justify-end border-t px-6 py-4">
                <Button asChild>
                  <Link href={href}>{t(ctaKey)}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </PageBackdrop>
  );
}
