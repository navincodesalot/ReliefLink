import mongoose from "mongoose";

import type {
  McpToolName,
  RecentActivityItem,
  ToolResult,
  TransferEventFilter,
} from "@/lib/ai/contracts";
import { connectDb } from "@/lib/db";
import { NodeModel } from "@/lib/models/Node";
import { Shipment } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { toNodeJSON, toShipmentJSON, toTransferEventJSON } from "@/lib/serialize";

function traceId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `trace-${Date.now()}`;
}

async function withMeta<T>(
  tool: McpToolName,
  fn: () => Promise<T>,
): Promise<ToolResult<T>> {
  const started = Date.now();
  const id = traceId();
  try {
    const data = await fn();
    return {
      ok: true,
      data,
      meta: {
        tool,
        durationMs: Date.now() - started,
        traceId: id,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "tool_error",
        message: error instanceof Error ? error.message : "unknown tool error",
      },
      meta: {
        tool,
        durationMs: Date.now() - started,
        traceId: id,
      },
    };
  }
}

export async function getShipmentTool(id: string) {
  return withMeta("getShipment", async () => {
    await connectDb();
    const shipment = await Shipment.findOne({ shipmentId: id });
    if (!shipment) throw new Error(`shipment ${id} not found`);
    return toShipmentJSON(shipment.toObject({ depopulate: true }) as never);
  });
}

export async function getNodeTool(id: string) {
  return withMeta("getNode", async () => {
    await connectDb();
    const node = await NodeModel.findOne({ nodeId: id });
    if (!node) throw new Error(`node ${id} not found`);
    return toNodeJSON(node.toObject({ depopulate: true }) as never);
  });
}

export async function getTransferEventsTool(filter: TransferEventFilter) {
  return withMeta("getTransferEvents", async () => {
    await connectDb();
    const query: Record<string, unknown> = {};

    if (filter.shipmentId) query.shipmentId = filter.shipmentId;
    if (filter.deviceId) query.deviceId = filter.deviceId;
    if (typeof filter.isAnomaly === "boolean") query.isAnomaly = filter.isAnomaly;
    if (filter.source) query.source = filter.source;
    if (filter.nodeId) {
      query.$or = [{ fromNodeId: filter.nodeId }, { toNodeId: filter.nodeId }];
    }
    if (filter.from || filter.to) {
      query.timestamp = {};
      if (filter.from) {
        (query.timestamp as Record<string, Date>).$gte = new Date(filter.from);
      }
      if (filter.to) {
        (query.timestamp as Record<string, Date>).$lte = new Date(filter.to);
      }
    }

    const events = await TransferEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(filter.limit ?? 50, 500));

    return events.map((event) =>
      toTransferEventJSON(event.toObject({ depopulate: true }) as never),
    );
  });
}

export async function queryShipmentsByStatusTool(status: string, limit?: number) {
  return withMeta("queryShipmentsByStatus", async () => {
    await connectDb();
    const shipments = await Shipment.find({ status })
      .sort({ lastUpdated: -1 })
      .limit(Math.min(limit ?? 100, 500));
    return shipments.map((shipment) =>
      toShipmentJSON(shipment.toObject({ depopulate: true }) as never),
    );
  });
}

export async function flagAnomalyTool(input: {
  eventId: string;
  reason?: string;
  severity?: "warning" | "critical";
  actor?: "rule_engine" | "gemini" | "operator";
}) {
  return withMeta("flagAnomaly", async () => {
    await connectDb();
    const session = await mongoose.startSession();
    try {
      let payload: Record<string, unknown> | null = null;
      await session.withTransaction(async () => {
        const event = await TransferEvent.findById(input.eventId).session(session);
        if (!event) throw new Error(`event ${input.eventId} not found`);

        event.isAnomaly = true;
        event.confirmed = false;
        event.anomalyReason = input.reason ?? event.anomalyReason ?? "flagged by operator";
        event.notes = [
          event.notes,
          `[${input.actor ?? "operator"}:${input.severity ?? "warning"}] ${event.anomalyReason}`,
        ]
          .filter(Boolean)
          .join(" | ");
        await event.save({ session });

        const leg = await ShipmentLeg.findOne({
          shipmentId: event.shipmentId,
          index: event.legIndex,
        }).session(session);
        if (leg) {
          leg.status = "flagged";
          leg.transferEventId = String(event._id);
          await leg.save({ session });
        }

        const shipment = await Shipment.findOne({ shipmentId: event.shipmentId }).session(session);
        if (!shipment) throw new Error(`shipment ${event.shipmentId} not found`);
        shipment.isFlagged = true;
        shipment.status = "flagged";
        shipment.lastUpdated = new Date();
        await shipment.save({ session });

        payload = {
          eventId: String(event._id),
          shipmentId: shipment.shipmentId,
          shipmentStatus: shipment.status,
          eventFlagged: true,
          severity: input.severity ?? "warning",
          reason: event.anomalyReason ?? "flagged by operator",
        };
      });

      if (!payload) throw new Error("flag anomaly transaction returned no payload");
      return payload;
    } finally {
      await session.endSession();
    }
  });
}

export async function getRecentActivityTool(limit?: number) {
  return withMeta("getRecentActivity", async () => {
    await connectDb();
    const [events, shipments] = await Promise.all([
      TransferEvent.find({})
        .sort({ timestamp: -1 })
        .limit(Math.min(limit ?? 25, 100)),
      Shipment.find({})
        .sort({ lastUpdated: -1 })
        .limit(Math.min(limit ?? 25, 100)),
    ]);

    const eventActivity: RecentActivityItem[] = events.map((event) => ({
      type: event.isAnomaly ? "anomaly" : "transfer_event",
      entityId: String(event._id),
      timestamp: event.timestamp.toISOString(),
      summary: event.isAnomaly
        ? `Shipment ${event.shipmentId} anomaly on leg ${event.legIndex}`
        : `Shipment ${event.shipmentId} handoff confirmed`,
      severity: event.isAnomaly ? "warning" : "info",
    }));
    const shipmentActivity: RecentActivityItem[] = shipments.map((shipment) => ({
      type: "shipment_update",
      entityId: shipment.shipmentId,
      timestamp: shipment.lastUpdated.toISOString(),
      summary: `Shipment ${shipment.shipmentId} is ${shipment.status}`,
      severity: shipment.isFlagged ? "critical" : "info",
    }));

    const activity: RecentActivityItem[] = [
      ...eventActivity,
      ...shipmentActivity,
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, Math.min(limit ?? 25, 100));

    return activity;
  });
}

export async function executeMcpTool(
  tool: McpToolName,
  args: Record<string, unknown>,
) {
  switch (tool) {
    case "getShipment":
      return getShipmentTool(String(args.id ?? ""));
    case "getNode":
      return getNodeTool(String(args.id ?? ""));
    case "getTransferEvents":
      return getTransferEventsTool(args as TransferEventFilter);
    case "queryShipmentsByStatus":
      return queryShipmentsByStatusTool(String(args.status ?? ""), Number(args.limit) || undefined);
    case "flagAnomaly":
      return flagAnomalyTool({
        eventId: String(args.eventId ?? ""),
        reason: typeof args.reason === "string" ? args.reason : undefined,
        severity:
          args.severity === "critical" || args.severity === "warning"
            ? args.severity
            : undefined,
        actor:
          args.actor === "rule_engine" || args.actor === "gemini" || args.actor === "operator"
            ? args.actor
            : undefined,
      });
    case "getRecentActivity":
      return getRecentActivityTool(Number(args.limit) || undefined);
  }
}
