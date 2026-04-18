"use client";

import { ArrowRight, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";

import type { TransferEvent } from "@/lib/types";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TransferTimeline({ events }: { events: TransferEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No transfers yet. Waiting for the first button press.
      </div>
    );
  }

  return (
    <ol className="relative space-y-6 border-l pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={`absolute -left-[29px] top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background ${
              event.isAnomaly
                ? "bg-destructive text-destructive-foreground"
                : "bg-emerald-500 text-white"
            }`}
          >
            {event.isAnomaly ? (
              <ShieldAlert className="h-3 w-3" />
            ) : (
              <ShieldCheck className="h-3 w-3" />
            )}
          </span>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{event.from}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{event.to}</span>
            <span className="text-xs text-muted-foreground">
              · {formatTime(event.timestamp)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>device {event.deviceId}</span>
            {event.isAnomaly && event.anomalyReason ? (
              <span className="text-destructive">anomaly: {event.anomalyReason}</span>
            ) : null}
            {event.solanaExplorerUrl ? (
              <a
                href={event.solanaExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
              >
                Solana tx <ExternalLink className="h-3 w-3" />
              </a>
            ) : !event.isAnomaly ? (
              <span>chain anchor pending</span>
            ) : null}
          </div>

          {event.notes ? (
            <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
