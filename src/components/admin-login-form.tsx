"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="border-border/70 bg-card/80 space-y-4 rounded-xl border p-6 shadow-sm backdrop-blur-md"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const res = await fetch("/api/auth/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? `Sign-in failed (${res.status})`);
            return;
          }
          router.push("/admin");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="admin-user">Username</Label>
        <Input
          id="admin-user"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-pass">Password</Label>
        <Input
          id="admin-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
