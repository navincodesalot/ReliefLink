import Link from "next/link";
import { Boxes, Eye, Shield, Truck } from "lucide-react";

import { PageBackdrop } from "@/components/page-backdrop";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLES = [
  {
    href: "/admin",
    title: "UN administrator",
    description:
      "Register Arduinos, drivers, and nodes; oversee emergencies and the full live map.",
    icon: Shield,
    cta: "Open console",
  },
  {
    href: "/nodes",
    title: "Network nodes",
    description:
      "Pick any site—warehouse, store, or local node. Record need / want / have, track drivers, and get late-leg alerts.",
    icon: Boxes,
    cta: "Open workspace",
  },
  {
    href: "/driver",
    title: "Driver",
    description:
      "Pick your driver profile, share location, and request help when you need it.",
    icon: Truck,
    cta: "Open driver",
  },
  {
    href: "/track",
    title: "Public chain of custody",
    description:
      "Inspect Solana testnet transactions for every verified handoff.",
    icon: Eye,
    cta: "View ledger",
  },
] as const;

export function LandingRolePicker() {
  return (
    <PageBackdrop>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <header className="space-y-4 text-center md:text-left">
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            ReliefLink
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Disaster food aid, verified on the ground and on-chain
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-relaxed text-pretty md:mx-0 md:text-base">
            Pick a portal below. Drivers, node operators, and public observers
            all open instantly — only the UN admin portal can seed new drivers.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {ROLES.map(({ href, title, description, icon: Icon, cta }) => (
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
                    <CardTitle className="text-lg leading-snug">
                      {title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="border-border/60 bg-muted/10 mt-auto justify-end border-t px-6 py-4">
                <Button asChild>
                  <Link href={href}>{cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </PageBackdrop>
  );
}
