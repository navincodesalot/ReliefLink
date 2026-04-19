"use client";

import { type FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runStagedLedgerUi } from "@/lib/staged-ledger-ui";

type Props = {
  onRegistered?: () => void;
};

export function AdminRegisterDriverCard({ onRegistered }: Props) {
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !deviceId.trim()) {
      toast.error("Name and device ID are required.");
      return;
    }
    if (!/^[-a-zA-Z0-9._]+$/.test(deviceId.trim())) {
      toast.error("Device ID must be letters, numbers, dot, underscore, or hyphen.");
      return;
    }
    setBusy(true);
    try {
      await runStagedLedgerUi({
        steps: [
          { label: "Allocating driver slot…", minMs: 250, maxMs: 500 },
          { label: "Provisioning device…", minMs: 300, maxMs: 700 },
          { label: "Writing to MongoDB…", minMs: 250, maxMs: 500 },
        ],
        successLabel: `Driver "${name.trim()}" registered.`,
        errorLabel: "Could not register driver.",
        run: async () => {
          const res = await fetch("/api/admin/register-driver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              driverDeviceId: deviceId.trim(),
              email: email.trim() || undefined,
            }),
          });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
          return data;
        },
      });
      setName("");
      setDeviceId("");
      setEmail("");
      onRegistered?.();
    } catch {
      // toast already surfaced
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" /> Register driver
        </CardTitle>
        <CardDescription>
          Seed a new field driver. They appear instantly in driver, shipment, and
          assignment dropdowns across the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="drv-name">Full name</Label>
            <Input
              id="drv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maria Rossi"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drv-device">Device ID</Label>
            <Input
              id="drv-device"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="driver-uno-04"
              pattern="[-a-zA-Z0-9._]+"
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="drv-email">Email (optional)</Label>
            <Input
              id="drv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.org"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Registering…" : "Register driver"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
