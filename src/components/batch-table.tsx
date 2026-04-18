"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { Batch } from "@/lib/types";

type Props = {
  batches: Batch[];
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function BatchTable({ batches }: Props) {
  if (batches.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No batches yet. Create one above to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Batch</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Current holder</th>
            <th className="px-4 py-2.5 font-medium">Destination</th>
            <th className="px-4 py-2.5 font-medium">Transfers</th>
            <th className="px-4 py-2.5 font-medium">Last updated</th>
            <th className="px-4 py-2.5 font-medium">Chain</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {batches.map((batch) => (
            <tr key={batch.id} className="hover:bg-muted/30">
              <td className="px-4 py-2.5 font-medium">
                <Link
                  href={`/batch/${encodeURIComponent(batch.batchId)}`}
                  className="underline-offset-2 hover:underline"
                >
                  {batch.batchId}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={batch.status} isFlagged={batch.isFlagged} />
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {batch.currentHolder}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {batch.intendedDestination}
              </td>
              <td className="px-4 py-2.5 tabular-nums">{batch.totalTransfers}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {formatTime(batch.lastUpdated)}
              </td>
              <td className="px-4 py-2.5">
                {batch.solanaExplorerUrl ? (
                  <a
                    href={batch.solanaExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    view <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
