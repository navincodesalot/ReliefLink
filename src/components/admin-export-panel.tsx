"use client";

import { useState } from "react";
import { Download, FileJson, Sheet, Table2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(contentDisposition);
  return m?.[1]?.replace(/"/g, "")?.trim() ?? null;
}

async function downloadExport(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (typeof j.error === "string") msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const name = parseFilename(res.headers.get("Content-Disposition")) ?? "relieflink-export";
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
}

export function AdminExportPanel() {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, url: string) {
    setBusy(key);
    try {
      await downloadExport(url);
      toast.success("Download started.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  const tripJson = `/api/admin/export?resource=trips&format=json`;
  const tripCsvShipments = `/api/admin/export?resource=trips&format=csv&slice=shipments`;
  const tripCsvLegs = `/api/admin/export?resource=trips&format=csv&slice=legs`;
  const tripCsvEvents = `/api/admin/export?resource=trips&format=csv&slice=events`;
  const whJson = `/api/admin/export?resource=warehouse&format=json`;
  const whCsv = `/api/admin/export?resource=warehouse&format=csv`;

  return (
    <Card className="border-border/80 bg-card/60 text-card-foreground backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base">Data export</CardTitle>
        <CardDescription>
          Download chain-of-custody and per-node inventory for reporting or backups. JSON
          includes full nested trip data; CSV files are spreadsheet-friendly (UTF-8 with BOM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trip / chain of custody
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("t-json", tripJson)}
            >
              {busy === "t-json" ? (
                "…"
              ) : (
                <>
                  <FileJson className="mr-1.5 h-3.5 w-3.5" /> Trips (JSON)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("t-csv-s", tripCsvShipments)}
            >
              {busy === "t-csv-s" ? (
                "…"
              ) : (
                <>
                  <Table2 className="mr-1.5 h-3.5 w-3.5" /> Shipments (CSV)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("t-csv-l", tripCsvLegs)}
            >
              {busy === "t-csv-l" ? (
                "…"
              ) : (
                <>
                  <Sheet className="mr-1.5 h-3.5 w-3.5" /> Legs (CSV)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("t-csv-e", tripCsvEvents)}
            >
              {busy === "t-csv-e" ? (
                "…"
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Transfer events (CSV)
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Node inventory logs
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("w-json", whJson)}
            >
              {busy === "w-json" ? (
                "…"
              ) : (
                <>
                  <FileJson className="mr-1.5 h-3.5 w-3.5" /> Inventory (JSON)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("w-csv", whCsv)}
            >
              {busy === "w-csv" ? (
                "…"
              ) : (
                <>
                  <Table2 className="mr-1.5 h-3.5 w-3.5" /> Inventory (CSV)
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
