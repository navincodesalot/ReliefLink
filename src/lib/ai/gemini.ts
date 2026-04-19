import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { OPS_TOOL_NAMES, type GeminiPlan } from "@/lib/ai/contracts";
import type { RiskSignal } from "@/lib/ai/risk";

type GeminiInput = {
  prompt: string;
  language: string;
  task:
    | "interpret"
    | "risk_analysis"
    | "summarize"
    | "translate"
    | "voice_script";
  toolManifest?: string[];
  toolResults?: unknown;
  riskSignal?: RiskSignal;
  region?: string;
  severity?: "info" | "warning" | "critical";
};

const opsToolNameEnum = z.enum(
  OPS_TOOL_NAMES as unknown as [string, ...string[]],
);

const geminiPlanSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("tool_plan"),
    rationale: z.string(),
    toolCalls: z.array(
      z.object({
        tool: opsToolNameEnum,
        args: z.record(z.unknown()),
      }),
    ),
  }),
  z.object({
    mode: z.literal("final_response"),
    rationale: z.string(),
    response: z.object({
      text: z.string(),
      language: z.string().optional(),
      voiceScript: z.string().optional(),
      severity: z.enum(["info", "warning", "critical"]).optional(),
      data: z.record(z.unknown()).optional(),
    }),
  }),
]);

function heuristicGemini(input: GeminiInput): GeminiPlan {
  const lc = input.prompt.toLowerCase();

  if (input.task === "translate") {
    return {
      mode: "final_response",
      rationale: "Fallback translation template used because Gemini API is not configured.",
      response: {
        text: `Translated (${input.language}): ${input.prompt}`,
        language: input.language,
        severity: "info",
      },
    };
  }

  if (input.task === "voice_script") {
    return {
      mode: "final_response",
      rationale: "Fallback speech template used because Gemini API is not configured.",
      response: {
        text: input.prompt,
        language: input.language,
        voiceScript: `${input.severity === "critical" ? "Critical alert." : "ReliefLink update."} ${input.prompt}`,
        severity: input.severity ?? "info",
      },
    };
  }

  if (lc.includes("recent activity")) {
    return {
      mode: "tool_plan",
      rationale: "The request clearly maps to recent activity retrieval.",
      toolCalls: [{ tool: "getRecentActivity", args: { limit: 10 } }],
    };
  }

  if (lc.includes("shipment")) {
    const id = input.prompt.match(/\b([A-Z]{1,4}-?\d{2,})\b/i)?.[1];
    if (id) {
      return {
        mode: "tool_plan",
        rationale: "The request appears to target a single shipment lookup.",
        toolCalls: [{ tool: "getShipment", args: { id } }],
      };
    }
  }

  if (input.task === "risk_analysis" && input.riskSignal) {
    const affected = input.riskSignal.affectedShipmentIds;
    return {
      mode: "final_response",
      rationale: "Fallback risk summary synthesized from deterministic signals.",
      response: {
        text:
          affected.length === 0
            ? `No shipments appear at immediate risk in ${input.region ?? "the selected region"}.`
            : `${affected.length} shipments are at risk in ${input.region ?? "the selected region"} based on stale movement or anomaly clusters: ${affected.join(", ")}.`,
        language: input.language,
        severity: input.riskSignal.severity,
        data: {
          affectedShipmentIds: affected,
        },
      },
    };
  }

  return {
    mode: "final_response",
    rationale: "Fallback natural-language answer generated without live model access.",
    response: {
      text: "The request needs interpretation, but no Google Generative AI API key is configured. Set GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) for the coordinator.",
      language: input.language,
      severity: "warning",
    },
  };
}

export async function callGemini(input: GeminiInput): Promise<GeminiPlan> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ??
    process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return heuristicGemini(input);
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }

  const modelId =
    process.env.COORDINATOR_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.0-flash";

  try {
    const { object } = await generateObject({
      model: google(modelId),
      schema: geminiPlanSchema,
      prompt: `You are ReliefLink's operations coordinator. Choose either a tool_plan (to fetch live MongoDB-backed operational data) or a final_response with natural language. Respond ONLY with JSON that matches the schema.

Request payload:
${JSON.stringify(input, null, 2)}`,
    });
    return object as GeminiPlan;
  } catch {
    return heuristicGemini(input);
  }
}
