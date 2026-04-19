import { z } from "zod";

import { NodeModel, type NodeDoc } from "@/lib/models/Node";
import { Shipment, type ShipmentDoc } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { processTap } from "@/lib/tap-handler";

const MAX_AUDIO_TEXT = 240;

const GenericVoiceSchema = z
  .object({
    command: z
      .enum([
        "launch",
        "create_shipment",
        "shipment_status",
        "driver_status",
        "simulate_tap",
        "latest_update",
      ])
      .default("launch"),
    origin: z.string().min(1).optional(),
    originNodeId: z.string().min(1).optional(),
    destination: z.string().min(1).optional(),
    finalDestinationNodeId: z.string().min(1).optional(),
    waypoints: z.array(z.string().min(1)).max(8).optional(),
    description: z.string().max(200).optional(),
    cargo: z.string().max(120).optional(),
    quantity: z.number().int().nonnegative().optional(),
    driverDeviceId: z
      .string()
      .regex(/^[-a-zA-Z0-9._]+$/)
      .max(64)
      .optional(),
    shipmentId: z.string().min(1).optional(),
    deviceId: z
      .string()
      .regex(/^[-a-zA-Z0-9._]+$/)
      .max(64)
      .optional(),
    legIndex: z.number().int().nonnegative().optional(),
    preferAudio: z.boolean().optional(),
  })
  .passthrough();

type VoiceCommand =
  | { kind: "launch"; preferAudio: boolean }
  | {
      kind: "create_shipment";
      originRef: string;
      destinationRef: string;
      waypoints: string[];
      description?: string;
      cargo?: string;
      quantity?: number;
      driverDeviceId?: string;
      preferAudio: boolean;
    }
  | { kind: "shipment_status"; shipmentRef?: string; preferAudio: boolean }
  | { kind: "driver_status"; deviceId: string; preferAudio: boolean }
  | {
      kind: "simulate_tap";
      shipmentRef: string;
      legIndex: number;
      preferAudio: boolean;
    }
  | { kind: "latest_update"; preferAudio: boolean };

export type VoiceExecutionResult = {
  ok: boolean;
  speech: string;
  shortSpeech: string;
  preferAudio: boolean;
  data?: Record<string, unknown>;
  status?: number;
};

type AlexaRequestEnvelope = {
  request?: {
    type?: string;
    intent?: {
      name?: string;
      slots?: Record<string, { value?: string }>;
    };
  };
};

function normalizeRef(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSlot(
  slots: Record<string, { value?: string }> | undefined,
  name: string,
): string | undefined {
  const value = slots?.[name]?.value?.trim();
  return value ? value : undefined;
}

function summarizeRoute(nodes: NodeDoc[]): string {
  return nodes.map((node) => node.name).join(", then ");
}

function shipmentSummary(shipment: ShipmentDoc): string {
  const holder = shipment.currentHolderNodeId;
  return `Shipment ${shipment.shipmentId} is ${shipment.status.replace("_", " ")}, ${shipment.progressPct} percent complete, and currently held at ${holder}.`;
}

function latestEventSpeech(
  shipmentId: string,
  fromNodeId: string,
  toNodeId: string,
  timestamp: Date,
): string {
  const when = timestamp.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Latest update. Shipment ${shipmentId} was verified from ${fromNodeId} to ${toNodeId} at ${when}.`;
}

async function resolveNodeReference(reference: string): Promise<NodeDoc> {
  const trimmed = reference.trim();
  const normalized = normalizeRef(trimmed);
  const nodes = await NodeModel.find({ active: { $ne: false } }).sort({ name: 1 });

  const exact =
    nodes.find((node) => node.nodeId.toLowerCase() === trimmed.toLowerCase()) ??
    nodes.find((node) => normalizeRef(node.name) === normalized) ??
    nodes.find((node) => normalizeRef(node.nodeId) === normalized);

  if (exact) return exact;

  const partial = nodes.filter((node) => {
    const name = normalizeRef(node.name);
    const nodeId = normalizeRef(node.nodeId);
    return name.includes(normalized) || nodeId.includes(normalized);
  });

  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1) {
    throw new Error(
      `node reference "${reference}" is ambiguous. Try one of: ${partial
        .slice(0, 4)
        .map((node) => node.nodeId)
        .join(", ")}`,
    );
  }

  throw new Error(`node "${reference}" was not found`);
}

async function createShipmentFromVoice(command: Extract<VoiceCommand, { kind: "create_shipment" }>) {
  const origin = await resolveNodeReference(command.originRef);
  const destination = await resolveNodeReference(command.destinationRef);

  if (origin.nodeId === destination.nodeId) {
    return {
      ok: false,
      speech: "Origin and destination must be different.",
      shortSpeech: "Origin and destination must be different.",
      preferAudio: command.preferAudio,
      status: 400,
    } satisfies VoiceExecutionResult;
  }

  const waypointNodes: NodeDoc[] = [];
  for (const waypoint of command.waypoints) {
    waypointNodes.push(await resolveNodeReference(waypoint));
  }

  const route = [origin, ...waypointNodes, destination];
  const routeIds = route.map((node) => node.nodeId);
  if (new Set(routeIds).size !== routeIds.length) {
    return {
      ok: false,
      speech: "The route repeats a node. Please use each node only once.",
      shortSpeech: "The route repeats a node.",
      preferAudio: command.preferAudio,
      status: 400,
    } satisfies VoiceExecutionResult;
  }

  const hardwareLess = route.slice(1).filter((node) => !node.hasHardware);
  if (hardwareLess.length) {
    return {
      ok: false,
      speech: `I cannot create that shipment yet because ${hardwareLess
        .map((node) => node.name)
        .join(", ")} does not have hardware assigned.`,
      shortSpeech: "One or more destination nodes still need hardware.",
      preferAudio: command.preferAudio,
      status: 400,
    } satisfies VoiceExecutionResult;
  }

  const shipmentId = `SH-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();
  const legDefs = routeIds.slice(0, -1).map((from, index) => ({
    from,
    to: routeIds[index + 1]!,
    index,
  }));

  const shipment = await Shipment.create({
    shipmentId,
    description: command.description,
    cargo: command.cargo,
    quantity: command.quantity,
    originNodeId: origin.nodeId,
    finalDestinationNodeId: destination.nodeId,
    nodeRoute: routeIds,
    status: "in_transit",
    totalLegs: legDefs.length,
    completedLegs: 0,
    currentLegIndex: 0,
    currentHolderNodeId: origin.nodeId,
    progressPct: 0,
    isFlagged: false,
    solanaSignatures: [],
    lastUpdated: now,
  });

  await ShipmentLeg.insertMany(
    legDefs.map((leg) => ({
      shipmentId,
      index: leg.index,
      fromNodeId: leg.from,
      toNodeId: leg.to,
      driverDeviceId: command.driverDeviceId,
      status: leg.index === 0 ? "in_transit" : "pending",
      startedAt: leg.index === 0 ? now : undefined,
    })),
  );

  return {
    ok: true,
    speech: `Shipment ${shipmentId} created. Route is ${summarizeRoute(route)}.`,
    shortSpeech: `Shipment ${shipmentId} created.`,
    preferAudio: command.preferAudio,
    data: { shipmentId, route: routeIds },
  } satisfies VoiceExecutionResult;
}

async function getShipmentStatus(shipmentRef: string | undefined, preferAudio: boolean) {
  const shipment = shipmentRef
    ? await Shipment.findOne({ shipmentId: shipmentRef })
    : await Shipment.findOne().sort({ lastUpdated: -1 });

  if (!shipment) {
    return {
      ok: false,
      speech: shipmentRef
        ? `I could not find shipment ${shipmentRef}.`
        : "There are no shipments yet.",
      shortSpeech: "No shipment found.",
      preferAudio,
      status: 404,
    } satisfies VoiceExecutionResult;
  }

  return {
    ok: true,
    speech: shipmentSummary(shipment),
    shortSpeech: shipmentSummary(shipment),
    preferAudio,
    data: { shipmentId: shipment.shipmentId, status: shipment.status },
  } satisfies VoiceExecutionResult;
}

async function getDriverStatus(deviceId: string, preferAudio: boolean) {
  const leg = await ShipmentLeg.findOne({
    driverDeviceId: deviceId,
    status: { $in: ["in_transit", "pending"] },
  }).sort({ status: -1, index: 1 });
  const shipment = leg
    ? await Shipment.findOne({ shipmentId: leg.shipmentId })
    : null;

  if (!leg || !shipment) {
    return {
      ok: true,
      speech: `Device ${deviceId} does not have an active assignment right now.`,
      shortSpeech: `Device ${deviceId} has no active assignment.`,
      preferAudio,
      data: { deviceId },
    } satisfies VoiceExecutionResult;
  }

  return {
    ok: true,
    speech: `Device ${deviceId} is assigned to shipment ${shipment.shipmentId}, leg ${leg.index + 1}, from ${leg.fromNodeId} to ${leg.toNodeId}. Current leg status is ${leg.status.replace("_", " ")}.`,
    shortSpeech: `Device ${deviceId} is assigned to shipment ${shipment.shipmentId}.`,
    preferAudio,
    data: { deviceId, shipmentId: shipment.shipmentId, legIndex: leg.index },
  } satisfies VoiceExecutionResult;
}

async function simulateTapFromVoice(
  shipmentRef: string,
  legIndex: number,
  preferAudio: boolean,
) {
  const result = await processTap({
    source: "simulated_tap",
    shipmentId: shipmentRef,
    legIndex,
  });

  if (!result.ok) {
    return {
      ok: false,
      speech: result.error,
      shortSpeech: result.error,
      preferAudio,
      status: result.status,
    } satisfies VoiceExecutionResult;
  }

  const speech = result.event.isAnomaly
    ? `Tap recorded, but shipment ${result.shipment.shipmentId} was flagged because ${result.event.anomalyReason ?? "an anomaly was detected"}.`
    : result.event.solanaSignature
      ? `Delivery confirmed for shipment ${result.shipment.shipmentId}. Leg ${result.leg.index + 1} is complete and the proof is recorded on Solana.`
      : `Delivery confirmed for shipment ${result.shipment.shipmentId}. Leg ${result.leg.index + 1} is complete, but the chain anchor failed.`;

  return {
    ok: true,
    speech,
    shortSpeech: speech,
    preferAudio,
    data: {
      shipmentId: result.shipment.shipmentId,
      legIndex: result.leg.index,
      eventId: String(result.event._id),
      solanaSignature: result.event.solanaSignature ?? null,
    },
  } satisfies VoiceExecutionResult;
}

async function getLatestUpdate(preferAudio: boolean) {
  const latest = await TransferEvent.findOne().sort({ timestamp: -1 });
  if (latest) {
    return {
      ok: true,
      speech: latestEventSpeech(
        latest.shipmentId,
        latest.fromNodeId,
        latest.toNodeId,
        latest.timestamp,
      ),
      shortSpeech: `Latest update for ${latest.shipmentId}.`,
      preferAudio,
      data: { shipmentId: latest.shipmentId, eventId: String(latest._id) },
    } satisfies VoiceExecutionResult;
  }

  const shipment = await Shipment.findOne().sort({ lastUpdated: -1 });
  if (!shipment) {
    return {
      ok: true,
      speech: "There is no activity to report yet.",
      shortSpeech: "No activity yet.",
      preferAudio,
    } satisfies VoiceExecutionResult;
  }

  return {
    ok: true,
    speech: shipmentSummary(shipment),
    shortSpeech: `Latest shipment is ${shipment.shipmentId}.`,
    preferAudio,
    data: { shipmentId: shipment.shipmentId },
  } satisfies VoiceExecutionResult;
}

export function parseVoiceCommand(body: unknown): VoiceCommand {
  const alexa = body as AlexaRequestEnvelope;
  const requestType = alexa?.request?.type;
  const intent = alexa?.request?.intent;
  const slots = intent?.slots;

  if (requestType === "LaunchRequest") {
    return { kind: "launch", preferAudio: true };
  }

  if (requestType === "IntentRequest" && intent?.name) {
    switch (intent.name) {
      case "CreateShipmentIntent":
        return {
          kind: "create_shipment",
          originRef: getSlot(slots, "origin") ?? "",
          destinationRef: getSlot(slots, "destination") ?? "",
          waypoints: (getSlot(slots, "waypoints") ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          description: getSlot(slots, "description"),
          cargo: getSlot(slots, "cargo"),
          quantity: (() => {
            const raw = getSlot(slots, "quantity");
            if (!raw) return undefined;
            const parsed = Number(raw);
            return Number.isFinite(parsed) ? parsed : undefined;
          })(),
          driverDeviceId: getSlot(slots, "deviceId"),
          preferAudio: true,
        };
      case "ShipmentStatusIntent":
        return {
          kind: "shipment_status",
          shipmentRef: getSlot(slots, "shipmentId"),
          preferAudio: true,
        };
      case "DriverStatusIntent":
        return {
          kind: "driver_status",
          deviceId: getSlot(slots, "deviceId") ?? "",
          preferAudio: true,
        };
      case "ConfirmArrivalIntent":
        return {
          kind: "simulate_tap",
          shipmentRef: getSlot(slots, "shipmentId") ?? "",
          legIndex: Math.max(0, Number(getSlot(slots, "legIndex") ?? "1") - 1),
          preferAudio: true,
        };
      case "LatestUpdateIntent":
        return { kind: "latest_update", preferAudio: true };
      default:
        return { kind: "launch", preferAudio: true };
    }
  }

  const parsed = GenericVoiceSchema.parse(body);
  const preferAudio = parsed.preferAudio ?? true;

  switch (parsed.command) {
    case "create_shipment":
      return {
        kind: "create_shipment",
        originRef: parsed.origin ?? parsed.originNodeId ?? "",
        destinationRef: parsed.destination ?? parsed.finalDestinationNodeId ?? "",
        waypoints: parsed.waypoints ?? [],
        description: parsed.description,
        cargo: parsed.cargo,
        quantity: parsed.quantity,
        driverDeviceId: parsed.driverDeviceId,
        preferAudio,
      };
    case "shipment_status":
      return { kind: "shipment_status", shipmentRef: parsed.shipmentId, preferAudio };
    case "driver_status":
      return {
        kind: "driver_status",
        deviceId: parsed.deviceId ?? "",
        preferAudio,
      };
    case "simulate_tap":
      return {
        kind: "simulate_tap",
        shipmentRef: parsed.shipmentId ?? "",
        legIndex: parsed.legIndex ?? 0,
        preferAudio,
      };
    case "latest_update":
      return { kind: "latest_update", preferAudio };
    default:
      return { kind: "launch", preferAudio };
  }
}

export async function executeVoiceCommand(
  command: VoiceCommand,
): Promise<VoiceExecutionResult> {
  switch (command.kind) {
    case "launch":
      return {
        ok: true,
        speech:
          "ReliefLink is online. You can create a shipment, ask for the latest update, check a shipment, or confirm an arrival.",
        shortSpeech: "ReliefLink is online.",
        preferAudio: command.preferAudio,
      };
    case "create_shipment":
      if (!command.originRef || !command.destinationRef) {
        return {
          ok: false,
          speech: "I need both an origin and a destination to create a shipment.",
          shortSpeech: "Origin and destination are required.",
          preferAudio: command.preferAudio,
          status: 400,
        };
      }
      return createShipmentFromVoice(command);
    case "shipment_status":
      return getShipmentStatus(command.shipmentRef, command.preferAudio);
    case "driver_status":
      if (!command.deviceId) {
        return {
          ok: false,
          speech: "I need a device ID to check driver status.",
          shortSpeech: "Device ID is required.",
          preferAudio: command.preferAudio,
          status: 400,
        };
      }
      return getDriverStatus(command.deviceId, command.preferAudio);
    case "simulate_tap":
      if (!command.shipmentRef) {
        return {
          ok: false,
          speech: "I need a shipment ID to simulate a tap.",
          shortSpeech: "Shipment ID is required.",
          preferAudio: command.preferAudio,
          status: 400,
        };
      }
      return simulateTapFromVoice(
        command.shipmentRef,
        command.legIndex,
        command.preferAudio,
      );
    case "latest_update":
      return getLatestUpdate(command.preferAudio);
  }
}

export function escapeSsml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildAlexaResponse(options: {
  speech: string;
  audioUrl?: string | null;
  endSession?: boolean;
}) {
  const safeSpeech = escapeSsml(options.speech);
  const withAudio =
    options.audioUrl && options.audioUrl.length > 0
      ? `<speak><audio src="${escapeSsml(options.audioUrl)}"/> <break time="300ms"/> ${safeSpeech}</speak>`
      : `<speak>${safeSpeech}</speak>`;

  return {
    version: "1.0",
    response: {
      shouldEndSession: options.endSession ?? true,
      outputSpeech: {
        type: "SSML",
        ssml: withAudio,
      },
      card: {
        type: "Simple",
        title: "ReliefLink",
        content: options.speech,
      },
    },
  };
}

export function shouldUseAlexaEnvelope(body: unknown): boolean {
  return Boolean(
    body &&
      typeof body === "object" &&
      "request" in (body as Record<string, unknown>),
  );
}

export function buildAudioText(text: string): string {
  return text.trim().slice(0, MAX_AUDIO_TEXT);
}
