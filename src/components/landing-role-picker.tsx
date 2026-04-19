import Link from "next/link";
import { Boxes, Eye, Shield, Truck } from "lucide-react";

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
    href: "/warehouse",
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-950/10 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(56,189,248,0.15),transparent)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <header className="space-y-4 text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            ReliefLink
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Disaster food aid, verified on the ground and on-chain
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:mx-0 md:text-base">
            Pick a portal below. Drivers, node operators, and public observers all open
            instantly — only the UN admin portal can seed new drivers.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {ROLES.map(({ href, title, description, icon: Icon, cta }) => (
            <Card
              key={href}
              className="flex flex-col border-border/70 bg-card/70 shadow-sm backdrop-blur-md transition hover:border-primary/35 hover:shadow-md"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-muted/50 text-foreground shadow-inner">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-snug">{title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="mt-auto justify-end border-t border-border/60 bg-muted/10 px-6 py-4">
                <Button asChild>
                  <Link href={href}>{cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
