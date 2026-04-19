"use client";

import confetti from "canvas-confetti";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Radio,
  RefreshCw,
  Truck,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SearchableSelect, type SearchOption } from "@/components/searchable-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatDistanceKm, haversineKm } from "@/lib/geo";
import { runStagedLedgerUi } from "@/lib/staged-ledger-ui";
import type { DriverJobJSON } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROOF_WINDOW_MS = 120_000;

const STORAGE_KEY = "relieflink.driverDeviceId";
const POLL_MS = 2500;

type DriverRow = {
  driverDeviceId: string;
  name: string;
  email: string;
};

export function DriverConsole() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [job, setJob] = useState<DriverJobJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const celebratedLegKey = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setDeviceId(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const d = (await res.json()) as { drivers: DriverRow[] };
      setDrivers(d.drivers);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint("Location unavailable (use HTTPS or enable GPS).");
      return;
    }
    setGeoHint(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLivePos({ lat, lng });
        void fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            lat,
            lng,
            accuracyM: pos.coords.accuracy,
          }),
        });
      },
      () => setGeoHint("Could not read GPS—check browser permissions."),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [deviceId]);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/driver/${encodeURIComponent(id)}/jobs`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DriverJobJSON;
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    void load(deviceId);
    const id = setInterval(() => void load(deviceId), POLL_MS);
    return () => clearInterval(id);
  }, [deviceId, load]);

  useEffect(() => {
    const leg = job?.leg;
    if (!leg || leg.status !== "done") return;
    const key = `${job?.shipment?.shipmentId ?? "?"}:${leg.index}`;
    if (celebratedLegKey.current === key) return;
    celebratedLegKey.current = key;
    void fireCelebration();
    toast.success("Handoff anchored on Solana.", {
      description: leg.solanaExplorerUrl
        ? "View the signed leg on Solana Explorer."
        : "The leg is complete.",
    });
  }, [job]);

  function chooseDriver(id: string) {
    if (!/^[-a-zA-Z0-9._]+$/.test(id)) {
      setError("device ID: letters, numbers, dot, underscore, hyphen only");
      return;
    }
    setError(null);
    setDeviceId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    const picked = drivers.find((d) => d.driverDeviceId === id);
    if (picked) {
      toast.success(`Signed in as ${picked.name}`, {
        description: `device ${picked.driverDeviceId}`,
      });
    }
  }

  function clearDevice() {
    setDeviceId("");
    setJob(null);
    celebratedLegKey.current = null;
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }

  const driverOptions: SearchOption[] = drivers.map((d) => ({
    value: d.driverDeviceId,
    label: d.name,
    description: d.driverDeviceId,
    keywords: [d.email, d.driverDeviceId],
  }));

  const current = drivers.find((d) => d.driverDeviceId === deviceId);

  return (
    <div className="relative mx-auto w-full max-w-2xl space-y-6 overflow-hidden p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.1),transparent)]" />
      <div className="relative space-y-6">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Truck className="h-6 w-6 text-amber-500" /> Driver console
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick your driver profile — your GPS, active leg, and distance to the next
            stop update live for UN admins and warehouses.
          </p>
          {geoHint ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{geoHint}</p>
          ) : null}
        </header>

        {!deviceId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select driver</CardTitle>
              <CardDescription>
                Only drivers seeded by the UN admin can sign in here. Search by name,
                email, or device ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="driver-picker">Driver</Label>
                <SearchableSelect
                  id="driver-picker"
                  options={driverOptions}
                  value=""
                  onChange={chooseDriver}
                  placeholder={
                    drivers.length === 0
                      ? "No drivers seeded yet…"
                      : "Search drivers…"
                  }
                  searchPlaceholder="Search name, email, or device id…"
                  emptyMessage="No matching drivers."
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-card/80">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {current?.name ?? deviceId}
                  </div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {deviceId}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearDevice}>
                  Switch driver
                </Button>
              </CardContent>
            </Card>
            <JobCard
              job={job}
              deviceId={deviceId}
              loading={loading}
              error={error}
              livePos={livePos}
              refresh={() => void load(deviceId)}
            />
            <DriverEmergencyPanel deviceId={deviceId} />
          </>
        )}
      </div>
    </div>
  );
}

function renderQualityBadge(leg: NonNullable<DriverJobJSON["leg"]>) {
  if (leg.deliveryQuality === "good") return <Badge variant="success">good</Badge>;
  if (leg.deliveryQuality === "acceptable")
    return <Badge variant="warning">acceptable</Badge>;
  if (leg.deliveryQuality === "poor")
    return <Badge variant="destructive">poor condition</Badge>;
  if (leg.deliveryMatchesManifest === false)
    return <Badge variant="destructive">manifest mismatch</Badge>;
  return null;
}

function ProofCapturePanel({
  deviceId,
  proofDueAt,
  refresh,
}: {
  deviceId: string;
  proofDueAt: string | null;
  refresh: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const deadlineMs = useMemo(
    () => (proofDueAt ? new Date(proofDueAt).getTime() : null),
    [proofDueAt],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const msLeft = deadlineMs ? Math.max(0, deadlineMs - now) : 0;
  const secondsLeft = Math.ceil(msLeft / 1000);
  const expired = deadlineMs !== null && msLeft <= 0;
  const pct = deadlineMs ? (msLeft / PROOF_WINDOW_MS) * 100 : 0;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  async function submit() {
    if (!file) {
      toast.error("Take a photo of the goods first.");
      return;
    }
    if (expired) {
      toast.error("The 2-minute window expired. Refresh to see the updated status.");
      refresh();
      return;
    }
    setSubmitting(true);
    try {
      const resized = await downscaleImage(file, 1600);
      const form = new FormData();
      form.append("deviceId", deviceId);
      form.append("photo", resized, "delivery.jpg");

      const data = await runStagedLedgerUi<{
        verdict?: {
          matchesManifest: boolean;
          quality: "good" | "acceptable" | "poor";
          rationale: string;
          flagged: boolean;
        };
        error?: string;
      }>({
        steps: [
          { label: "Uploading delivery photo…" },
          { label: "Verifying items with Gemini…" },
          { label: "Anchoring handoff on Solana…" },
        ],
        successLabel: "Delivery verified and anchored.",
        errorLabel: "Photo verification failed.",
        run: async () => {
          const res = await fetch("/api/driver/delivery-proof", {
            method: "POST",
            body: form,
          });
          const json = (await res.json()) as {
            error?: string;
            verdict?: {
              matchesManifest: boolean;
              quality: "good" | "acceptable" | "poor";
              rationale: string;
              flagged: boolean;
            };
          };
          if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
          return json;
        },
      });

      if (data.verdict) {
        const { matchesManifest, quality, rationale, flagged } = data.verdict;
        if (flagged) {
          toast.warning(
            matchesManifest
              ? `Delivered but quality flagged as ${quality}.`
              : "Delivered but goods do not match the manifest.",
            { description: rationale },
          );
        } else {
          toast.success(`Delivery verified (${quality}).`, { description: rationale });
        }
      }
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
    } catch {
      // runStagedLedgerUi already surfaced the error toast.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Alert className="border-blue-500/40 bg-blue-500/10">
        <Camera className="h-4 w-4" />
        <AlertTitle>Delivery photo required</AlertTitle>
        <AlertDescription>
          Capture the goods you delivered so AI can verify the shipment. You have{" "}
          <span className="font-mono font-semibold">
            {secondsLeft > 0 ? `${secondsLeft}s` : "0s"}
          </span>{" "}
          before this leg is flagged for audit.
        </AlertDescription>
      </Alert>

      <Progress
        value={pct}
        className={cn(
          "h-2",
          expired
            ? "[&>div]:bg-destructive"
            : msLeft < 30_000
              ? "[&>div]:bg-destructive"
              : msLeft < 60_000
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-blue-500",
        )}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onFileChange}
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Delivery preview"
            className="h-48 w-full object-cover sm:h-64"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="lg"
          variant={file ? "outline" : "default"}
          className="h-12 flex-1 text-base"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || expired}
        >
          <Camera className="h-5 w-5" />
          {file ? "Retake photo" : "Take photo of goods"}
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12 flex-1 text-base"
          onClick={() => void submit()}
          disabled={!file || submitting || expired}
        >
          <Upload className="h-5 w-5" />
          {submitting ? "Verifying…" : "Submit delivery photo"}
        </Button>
      </div>

      {expired ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh status
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Downscales an image client-side so mobile uploads stay under the API limit
 * and Gemini gets a reasonably sized frame. Returns a JPEG blob.
 */
async function downscaleImage(file: File, maxDim: number): Promise<Blob> {
  if (typeof window === "undefined") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
    );
    return blob ?? file;
  } finally {
    bitmap.close?.();
  }
}

async function fireCelebration() {
  const end = Date.now() + 600;
  const shoot = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 45,
      origin: { x: Math.random() * 0.6 + 0.2, y: 0.6 },
    });
    if (Date.now() < end) requestAnimationFrame(shoot);
  };
  shoot();
}

function DriverEmergencyPanel({ deviceId }: { deviceId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!message.trim()) {
      toast.error("Describe what you need.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/emergencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, message: message.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success("UN administrators have been notified.");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/35 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Emergency assistance
        </CardTitle>
        <CardDescription>
          Sends an alert to UN administrators with your device id and message. Use only
          for real incidents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Vehicle issue, route blocked, safety concern…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button type="button" variant="destructive" disabled={busy} onClick={() => void send()}>
          {busy ? "Sending…" : "Request assistance"}
        </Button>
      </CardContent>
    </Card>
  );
}

function JobCard({
  job,
  deviceId,
  loading,
  error,
  livePos,
  refresh,
}: {
  job: DriverJobJSON | null;
  deviceId: string;
  loading: boolean;
  error: string | null;
  livePos: { lat: number; lng: number } | null;
  refresh: () => void;
}) {
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }
  if (!job) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {loading ? "Checking for assignments…" : "No job found for this device."}
        </CardContent>
      </Card>
    );
  }

  const leg = job.leg;
  const shipment = job.shipment;

  if (!leg || !shipment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" />
            <span className="font-mono text-sm text-muted-foreground">{deviceId}</span>
          </CardTitle>
          <CardDescription>{job.message}</CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Waiting for an operator to assign this device to a shipment leg.
        </CardContent>
      </Card>
    );
  }

  const inTransit = leg.status === "in_transit";
  const awaitingProof = leg.status === "awaiting_proof";
  const done = leg.status === "done";
  const latestSig = shipment.latestSolanaExplorerUrl;
  const progress = shipment.progressPct;
  const qualityBadge = renderQualityBadge(leg);

  const distKm =
    livePos && job.toNode
      ? haversineKm(livePos, { lat: job.toNode.lat, lng: job.toNode.lng })
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Shipment {shipment.shipmentId}</CardTitle>
            <CardDescription>
              {shipment.description ?? shipment.cargo ?? "Relief cargo"}
              {shipment.quantity ? ` · ${shipment.quantity} units` : ""}
            </CardDescription>
          </div>
          <Badge
            variant={
              done
                ? "success"
                : inTransit
                  ? "warning"
                  : awaitingProof
                    ? "secondary"
                    : "secondary"
            }
          >
            {awaitingProof ? "photo required" : leg.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{job.fromNode?.name ?? leg.fromNodeId}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{job.toNode?.name ?? leg.toNodeId}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            leg {leg.index + 1}/{shipment.totalLegs}
          </span>
        </div>

        {job.toNode ? (
          <div className="rounded-md border p-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{job.toNode.name}</div>
                {distKm !== null ? (
                  <div className="text-sm font-semibold text-primary">
                    ~{formatDistanceKm(distKm)} to this stop (straight-line)
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Enable location to see distance to this warehouse.
                  </div>
                )}
                {job.toNode.address ? (
                  <div className="text-xs text-muted-foreground">{job.toNode.address}</div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  {job.toNode.lat.toFixed(4)}, {job.toNode.lng.toFixed(4)}
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${job.toNode.lat}&mlon=${job.toNode.lng}&zoom=14`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  open in map <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Shipment progress</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                shipment.isFlagged
                  ? "bg-destructive"
                  : progress >= 100
                    ? "bg-emerald-500"
                    : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {awaitingProof ? (
          <ProofCapturePanel
            deviceId={deviceId}
            proofDueAt={leg.proofDueAt}
            refresh={refresh}
          />
        ) : (
          <div
            className={cn(
              "rounded-md border p-3 text-sm",
              inTransit && "border-amber-500/40 bg-amber-500/10",
              done && "border-emerald-500/40 bg-emerald-500/10",
            )}
          >
            {inTransit ? (
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 animate-pulse text-amber-600" />
                <div>
                  <div className="font-medium">Waiting for tap at destination</div>
                  <div className="text-xs text-muted-foreground">
                    Touch the driver&apos;s copper pad to the beacon&apos;s pad. The store
                    will buzz after 3 seconds and the handoff will sign on Solana.
                  </div>
                </div>
              </div>
            ) : done ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Leg complete</span>
                    {qualityBadge}
                    {leg.proofSkippedReason === "timeout" ? (
                      <Badge variant="warning">photo missed</Badge>
                    ) : null}
                  </div>
                </div>
                {leg.solanaExplorerUrl ? (
                  <a
                    href={leg.solanaExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    view chain anchor <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                {leg.deliveryProofNotes ? (
                  <p className="text-xs text-muted-foreground">
                    {leg.deliveryProofNotes}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="text-muted-foreground">Leg is {leg.status}.</div>
            )}
          </div>
        )}

        {latestSig ? (
          <div className="text-xs text-muted-foreground">
            Latest on-chain anchor:{" "}
            <a
              href={latestSig}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {shipment.solanaSignatures[shipment.solanaSignatures.length - 1]?.slice(0, 12)}
              … <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
