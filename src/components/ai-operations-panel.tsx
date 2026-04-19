"use client";

import { useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AiResponse = {
  route: string;
  language: string;
  title?: string;
  summary: string;
  severity: "info" | "warning" | "critical";
  toolResults?: Array<Record<string, unknown>>;
  voice?: {
    script: string;
    provider: "elevenlabs";
    voiceId: string;
    audioUrl: string | null;
    echo?: {
      provider: "voicemonkey" | "ifttt";
      ready: boolean;
      message: string;
      command: {
        method: "POST";
        url: string;
        headers?: Record<string, string>;
        body?: Record<string, unknown>;
      } | null;
    };
  };
};

const SAMPLE_PROMPTS = [
  "Are any shipments at risk in the Midwest?",
  "Show shipment RL-1024",
  "Summarize recent activity",
];

export function AiOperationsPanel() {
  const { language, t } = useLanguage();
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-language": language,
        },
        body: JSON.stringify({ prompt }),
      });
      const json = (await res.json()) as AiResponse | { error: string };
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
      }
      setResponse(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-background via-background to-secondary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("coordinatorQuery")}</CardTitle>
        <CardDescription>{t("coordinatorHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              onClick={() => setPrompt(sample)}
            >
              {sample}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t("askPlaceholder")}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={onSubmit} disabled={loading || !prompt.trim()}>
              {loading ? t("loadingQuery") : t("runQuery")}
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {response ? (
          <div className="space-y-3 rounded-lg border border-border bg-background/80 p-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("responseLabel")} · {response.severity} · {response.language}
              </div>
              <div className="font-medium">
                {response.title ?? t("coordinatorQuery")}
              </div>
            </div>
            <p>{response.summary}</p>
            {response.voice ? (
              <div className="rounded-md bg-secondary/60 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("voiceDelivery")}
                </div>
                <p className="mt-1 text-sm">
                  Voice `{response.voice.voiceId}` via {response.voice.provider}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{response.voice.script}</p>
                {response.voice.audioUrl ? (
                  <audio className="mt-3 w-full" controls src={response.voice.audioUrl} />
                ) : null}
                {response.voice.echo ? (
                  <div className="mt-3 rounded-md border border-border bg-background/70 p-3 text-xs">
                    <div className="font-medium text-foreground">Amazon Echo</div>
                    <p className="mt-1 text-muted-foreground">{response.voice.echo.message}</p>
                    {response.voice.echo.command ? (
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px]">
{JSON.stringify(response.voice.echo.command, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
