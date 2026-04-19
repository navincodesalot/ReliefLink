import type { GeminiPlan } from "@/lib/ai/contracts";
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
    rationale: "Fallback natural-language answer generated without live Gemini access.",
    response: {
      text: "The request needs interpretation, but no Gemini API key is configured. The deterministic services are ready and can still handle direct tool requests.",
      language: input.language,
      severity: "warning",
    },
  };
}

export async function callGemini(input: GeminiInput): Promise<GeminiPlan> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return heuristicGemini(input);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash"}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify(input),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no structured content");
    return JSON.parse(text) as GeminiPlan;
  } catch {
    return heuristicGemini(input);
  }
}
