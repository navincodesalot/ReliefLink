import type {
  AiQueryResponse,
  DeterministicIntent,
  SessionContext,
} from "@/lib/ai/contracts";
import { callGemini } from "@/lib/ai/gemini";
import { executeMcpTool } from "@/lib/ai/mcp-tools";
import { computeRiskSignals } from "@/lib/ai/risk";
import { buildVoiceAlert } from "@/lib/ai/voice";
import type { ShipmentJSON, TransferEventJSON } from "@/lib/types";

function parseStatus(text: string) {
  if (text.includes("flagged")) return "flagged";
  if (text.includes("delivered")) return "delivered";
  if (text.includes("in transit") || text.includes("in_transit"))
    return "in_transit";
  if (text.includes("created")) return "created";
  return null;
}

async function maybeTranslate(text: string, language: string) {
  if (language === "en") return text;
  const translated = await callGemini({
    prompt: text,
    language,
    task: "translate",
  });
  if (translated.mode === "final_response") {
    return translated.response.text;
  }
  return text;
}

function formatShipmentSummary(shipment: ShipmentJSON) {
  return `Shipment ${shipment.shipmentId} is ${shipment.status.replaceAll("_", " ")}, ${shipment.progressPct}% complete, and currently held by ${shipment.currentHolderNodeId}.`;
}

function formatShipmentList(status: string, shipments: ShipmentJSON[]) {
  if (shipments.length === 0) {
    return `No shipments are currently marked ${status.replaceAll("_", " ")}.`;
  }
  const preview = shipments
    .slice(0, 5)
    .map((shipment) => `${shipment.shipmentId} (${shipment.progressPct}%)`)
    .join(", ");
  return `${shipments.length} shipments are ${status.replaceAll("_", " ")}. Top results: ${preview}.`;
}

function formatNodeSummary(node: {
  nodeId: string;
  name: string;
  kind: string;
  active: boolean;
  pendingOnboarding: boolean;
}) {
  return `Node ${node.nodeId} is ${node.name}, a ${node.kind} location that is ${node.active ? "active" : "inactive"}${node.pendingOnboarding ? " and pending onboarding" : ""}.`;
}

function formatRecentActivity(
  items: Array<{
    summary: string;
    severity: string;
  }>,
) {
  if (items.length === 0) {
    return "No recent operational activity was found.";
  }
  return `Recent activity shows ${items.length} records. Latest items: ${items
    .slice(0, 3)
    .map((item) => `${item.summary} [${item.severity}]`)
    .join("; ")}.`;
}

async function summarizeToolResult(
  tool: string,
  args: Record<string, unknown>,
  data: unknown,
  language: string,
) {
  let title = "Operations update";
  let summary = "Request completed.";

  if (tool === "getShipment" && data && typeof data === "object") {
    title = `Shipment ${String(args.id ?? "")}`;
    summary = formatShipmentSummary(data as ShipmentJSON);
  } else if (tool === "queryShipmentsByStatus" && Array.isArray(data)) {
    const status = String(args.status ?? "requested");
    title = `${status.replaceAll("_", " ")} shipments`;
    summary = formatShipmentList(status, data as ShipmentJSON[]);
  } else if (tool === "getNode" && data && typeof data === "object") {
    title = `Node ${String(args.id ?? "")}`;
    summary = formatNodeSummary(
      data as {
        nodeId: string;
        name: string;
        kind: string;
        active: boolean;
        pendingOnboarding: boolean;
      },
    );
  } else if (tool === "getRecentActivity" && Array.isArray(data)) {
    title = "Recent activity";
    summary = formatRecentActivity(
      data as Array<{
        summary: string;
        severity: string;
      }>,
    );
  } else if (tool === "flagAnomaly" && data && typeof data === "object") {
    const payload = data as {
      shipmentId: string;
      reason: string;
      severity: string;
    };
    title = "Anomaly flagged";
    summary = `Shipment ${payload.shipmentId} was flagged for review with ${payload.severity} severity. Reason: ${payload.reason}.`;
  } else if (tool === "getTransferEvents" && Array.isArray(data)) {
    title = "Transfer events";
    summary =
      data.length === 0
        ? "No transfer events matched the requested filter."
        : `${data.length} transfer events matched the requested filter.`;
  } else if (Array.isArray(data)) {
    summary = `Returned ${data.length} records.`;
  } else if (data && typeof data === "object") {
    summary = "Returned a structured operations record.";
  }

  return {
    title,
    summary: await maybeTranslate(summary, language),
  };
}

export function parseIntent(prompt: string): DeterministicIntent {
  const text = prompt.trim().toLowerCase();

  if (text.includes("translate")) {
    return { confidence: 0.95, kind: "complex", reason: "translation" };
  }
  if (text.includes("summarize") || text.includes("summary")) {
    return { confidence: 0.95, kind: "complex", reason: "summary" };
  }
  if (text.includes("voice") || text.includes("speak")) {
    return { confidence: 0.95, kind: "complex", reason: "voice_script" };
  }
  if (text.includes("risk") || text.includes("at risk")) {
    return { confidence: 0.92, kind: "complex", reason: "risk_analysis" };
  }

  const shipmentMatch = prompt.match(/\bshipment\s+([A-Za-z0-9._-]+)\b/i);
  if (shipmentMatch) {
    return {
      confidence: 0.98,
      kind: "tool",
      tool: "getShipment",
      args: { id: shipmentMatch[1] },
    };
  }

  const nodeMatch = prompt.match(/\bnode\s+([A-Za-z0-9._-]+)\b/i);
  if (nodeMatch) {
    return {
      confidence: 0.98,
      kind: "tool",
      tool: "getNode",
      args: { id: nodeMatch[1] },
    };
  }

  const flagMatch = prompt.match(
    /\bflag\s+(?:anomaly\s+)?event\s+([A-Za-z0-9._-]+)\b/i,
  );
  if (flagMatch) {
    return {
      confidence: 0.98,
      kind: "tool",
      tool: "flagAnomaly",
      args: { eventId: flagMatch[1], actor: "operator", severity: "warning" },
    };
  }

  if (text.includes("recent activity")) {
    return {
      confidence: 0.97,
      kind: "tool",
      tool: "getRecentActivity",
      args: { limit: 10 },
    };
  }

  const status = parseStatus(text);
  if (status) {
    return {
      confidence: 0.96,
      kind: "tool",
      tool: "queryShipmentsByStatus",
      args: { status, limit: 50 },
    };
  }

  return { confidence: 0.4, kind: "complex", reason: "ambiguous" };
}

export async function handleAiQuery(input: {
  prompt: string;
  session: SessionContext;
}) {
  const intent = parseIntent(input.prompt);

  if (intent.kind === "tool" && intent.confidence >= 0.9) {
    const result = await executeMcpTool(intent.tool, intent.args);
    const rendered = result.ok
      ? await summarizeToolResult(
          intent.tool,
          intent.args,
          result.data,
          input.session.resolvedLanguage,
        )
      : null;

    return {
      route: "mcp_direct",
      language: input.session.resolvedLanguage,
      title: rendered?.title ?? "Operations update",
      summary: result.ok
        ? (rendered?.summary ?? "Request completed.")
        : await maybeTranslate(
            result.error?.message ?? "Tool call failed.",
            input.session.resolvedLanguage,
          ),
      severity: result.ok ? "info" : "warning",
      toolResults: [result as unknown as Record<string, unknown>],
    } satisfies AiQueryResponse;
  }

  if (intent.kind === "complex" && intent.reason === "risk_analysis") {
    const [shipmentsResult, eventsResult] = await Promise.all([
      executeMcpTool("queryShipmentsByStatus", {
        status: "in_transit",
        limit: 250,
      }),
      executeMcpTool("getTransferEvents", {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        limit: 250,
      }),
    ]);

    const shipments = shipmentsResult.ok
      ? (shipmentsResult.data as ShipmentJSON[])
      : [];
    const events = eventsResult.ok
      ? (eventsResult.data as TransferEventJSON[])
      : [];
    const signals = computeRiskSignals({
      shipments,
      events,
      regionQuery: input.prompt,
    });

    if (signals.confidence >= 0.8) {
      const voice =
        signals.severity === "critical"
          ? await buildVoiceAlert({
              text: signals.summary,
              language: input.session.resolvedLanguage,
              severity: signals.severity,
              region: input.session.region,
              baseLanguage: "en",
            })
          : undefined;

      return {
        route: "mcp_plus_rules",
        language: input.session.resolvedLanguage,
        title: "Regional shipment risk",
        summary: await maybeTranslate(
          signals.summary,
          input.session.resolvedLanguage,
        ),
        severity: signals.severity,
        toolResults: [
          shipmentsResult as unknown as Record<string, unknown>,
          eventsResult as unknown as Record<string, unknown>,
        ],
        voice,
      } satisfies AiQueryResponse;
    }

    const gemini = await callGemini({
      prompt: input.prompt,
      language: input.session.resolvedLanguage,
      task: "risk_analysis",
      riskSignal: signals,
      region: input.session.region,
    });

    if (gemini.mode === "final_response") {
      const voice =
        gemini.response.severity === "critical"
          ? await buildVoiceAlert({
              text: gemini.response.text,
              language: input.session.resolvedLanguage,
              severity: gemini.response.severity,
              region: input.session.region,
              baseLanguage: gemini.response.language ?? "en",
            })
          : undefined;

      return {
        route: "gemini_final_response",
        language: input.session.resolvedLanguage,
        title: "Regional shipment risk",
        summary:
          gemini.response.language === input.session.resolvedLanguage
            ? gemini.response.text
            : await maybeTranslate(
                gemini.response.text,
                input.session.resolvedLanguage,
              ),
        severity: gemini.response.severity ?? "warning",
        toolResults: [
          shipmentsResult as unknown as Record<string, unknown>,
          eventsResult as unknown as Record<string, unknown>,
        ],
        voice,
      } satisfies AiQueryResponse;
    }
  }

  const gemini = await callGemini({
    prompt: input.prompt,
    language: input.session.resolvedLanguage,
    task:
      intent.kind === "complex" && intent.reason === "translation"
        ? "translate"
        : intent.kind === "complex" && intent.reason === "summary"
          ? "summarize"
          : intent.kind === "complex" && intent.reason === "voice_script"
            ? "voice_script"
            : "interpret",
    toolManifest: [
      "getShipment",
      "getNode",
      "getTransferEvents",
      "queryShipmentsByStatus",
      "flagAnomaly",
      "getRecentActivity",
    ],
  });

  if (gemini.mode === "tool_plan") {
    const results = [];
    for (const call of gemini.toolCalls) {
      results.push(await executeMcpTool(call.tool, call.args));
    }

    return {
      route: "gemini_tool_plan",
      language: input.session.resolvedLanguage,
      title: "Coordinator query",
      summary: await maybeTranslate(
        "The request was interpreted and resolved through operational data tools.",
        input.session.resolvedLanguage,
      ),
      severity: "info",
      toolResults: results as unknown as Array<Record<string, unknown>>,
    } satisfies AiQueryResponse;
  }

  const voice =
    gemini.response.voiceScript || gemini.response.severity === "critical"
      ? await buildVoiceAlert({
          text: gemini.response.voiceScript ?? gemini.response.text,
          language: input.session.resolvedLanguage,
          severity: gemini.response.severity ?? "warning",
          region: input.session.region,
          baseLanguage: gemini.response.language ?? "en",
        })
      : undefined;

  return {
    route: "gemini_final_response",
    language: input.session.resolvedLanguage,
    title: "Coordinator query",
    summary:
      gemini.response.language === input.session.resolvedLanguage
        ? gemini.response.text
        : await maybeTranslate(
            gemini.response.text,
            input.session.resolvedLanguage,
          ),
    severity: gemini.response.severity ?? "warning",
    voice,
  } satisfies AiQueryResponse;
}
