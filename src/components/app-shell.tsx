"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Eye, Network, Shield, Truck } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", icon: Network },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/nodes", label: "Nodes", icon: Boxes },
  { href: "/driver", label: "Driver", icon: Truck },
  { href: "/track", label: "Ledger", icon: Eye },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="bg-primary/10 text-primary inline-flex h-7 w-7 items-center justify-center rounded-md">
            <Network className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">ReliefLink</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.filter((l) => l.href !== "/").map(
            ({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition",
                    active && "bg-accent text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            },
          )}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
