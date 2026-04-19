import type { ShipmentStatus } from "@/lib/constants";

export const OPS_TOOL_NAMES = [
  "getShipment",
  "getNode",
  "getTransferEvents",
  "queryShipmentsByStatus",
  "flagAnomaly",
  "getRecentActivity",
] as const;

export type OpsToolName = (typeof OPS_TOOL_NAMES)[number];

export type ToolResult<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta: {
    tool: string;
    durationMs: number;
    traceId: string;
  };
};

export type TransferEventFilter = {
  shipmentId?: string;
  nodeId?: string;
  deviceId?: string;
  source?: "hardware_tap" | "simulated_tap";
  isAnomaly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
};

export type LanguageSource =
  | "user_override"
  | "browser_override"
  | "browser"
  | "geo_default"
  | "system_default";

export type SessionContext = {
  resolvedLanguage: string;
  languageSource: LanguageSource;
  region: string;
  country: string;
  browserLanguage: string | null;
  userOverride: string | null;
};

export type RecentActivityItem = {
  type: "shipment_update" | "transfer_event" | "anomaly" | "node_update";
  entityId: string;
  timestamp: string;
  summary: string;
  severity: "info" | "warning" | "critical";
};

export type GeminiPlan =
  | {
      mode: "tool_plan";
      rationale: string;
      toolCalls: Array<{
        tool: OpsToolName;
        args: Record<string, unknown>;
      }>;
    }
  | {
      mode: "final_response";
      rationale: string;
      response: {
        text: string;
        language?: string;
        voiceScript?: string;
        severity?: "info" | "warning" | "critical";
        data?: Record<string, unknown>;
      };
    };

export type AiQueryResponse = {
  route:
    | "data_tool"
    | "risk_signal"
    | "ai_tool_plan"
    | "ai_response";
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

export type DeterministicIntent =
  | {
      confidence: number;
      kind: "tool";
      tool: OpsToolName;
      args: Record<string, unknown>;
    }
  | {
      confidence: number;
      kind: "complex";
      reason:
        | "ambiguous"
        | "risk_analysis"
        | "summary"
        | "translation"
        | "voice_script";
    };

export type ShipmentStatusFilter = {
  status: ShipmentStatus;
  limit?: number;
};

export type VoiceRequest = {
  text: string;
  language: string;
  severity: "info" | "warning" | "critical";
  region: string;
  baseLanguage?: string;
};
