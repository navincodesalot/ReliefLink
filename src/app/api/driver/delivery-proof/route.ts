import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DELIVERY_QUALITIES, type DeliveryQuality } from "@/lib/constants";
import { connectDb } from "@/lib/db";
import { Shipment } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { UserModel } from "@/lib/models/User";
import {
  toNodeJSON,
  toShipmentJSON,
  toShipmentLegJSON,
  toTransferEventJSON,
} from "@/lib/serialize";
import { finalizeLegAfterProof } from "@/lib/tap-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const DEFAULT_MODEL = "gemini-flash-latest";

const DeviceIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[-a-zA-Z0-9._]+$/);

const VerdictSchema = z.object({
  matchesManifest: z
    .boolean()
    .describe(
      "True if the visible goods in the photo plausibly match the described cargo and quantity.",
    ),
  quality: z
    .enum(DELIVERY_QUALITIES)
    .describe(
      "Overall condition of the delivered goods and packaging visible in the photo.",
    ),
  rationale: z
    .string()
    .max(400)
    .describe("One or two sentences explaining the verdict."),
});

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with `deviceId` and `photo` fields." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body." }, { status: 400 });
  }

  const deviceIdRaw = form.get("deviceId");
  const photo = form.get("photo");

  if (typeof deviceIdRaw !== "string") {
    return NextResponse.json({ error: "Missing `deviceId`." }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Missing `photo` file." }, { status: 400 });
  }
  if (photo.size === 0) {
    return NextResponse.json({ error: "Empty photo upload." }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      {
        error: `Photo too large (${Math.round(photo.size / 1024)} KB). Max 8 MB.`,
      },
      { status: 413 },
    );
  }

  const deviceParsed = DeviceIdSchema.safeParse(deviceIdRaw.trim());
  if (!deviceParsed.success) {
    return NextResponse.json({ error: "Invalid device id." }, { status: 400 });
  }
  const deviceId = deviceParsed.data;

  await connectDb();

  const driver = await UserModel.findOne({ role: "driver", driverDeviceId: deviceId });
  if (!driver) {
    return NextResponse.json(
      { error: "Unknown driver device. Ask an admin to register it." },
      { status: 404 },
    );
  }

  const leg = await ShipmentLeg.findOne({
    driverDeviceId: deviceId,
    status: "awaiting_proof",
  }).sort({ index: 1 });
  if (!leg) {
    return NextResponse.json(
      { error: "No delivery is awaiting a photo for this driver." },
      { status: 404 },
    );
  }

  const now = new Date();
  if (leg.proofDueAt && leg.proofDueAt.getTime() < now.getTime()) {
    return NextResponse.json(
      {
        error:
          "The 2-minute photo window has expired. Refresh to see the updated status.",
      },
      { status: 410 },
    );
  }

  const shipment = await Shipment.findOne({ shipmentId: leg.shipmentId });
  if (!shipment) {
    return NextResponse.json({ error: "Shipment missing for leg." }, { status: 404 });
  }
  const event = leg.transferEventId
    ? await TransferEvent.findById(leg.transferEventId)
    : null;
  if (!event) {
    return NextResponse.json(
      { error: "Tap event missing for this leg." },
      { status: 404 },
    );
  }

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI verification is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY.",
      },
      { status: 503 },
    );
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && apiKey) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }

  const photoBytes = new Uint8Array(await photo.arrayBuffer());
  const mediaType = photo.type?.startsWith("image/") ? photo.type : "image/jpeg";

  const manifestSummary = [
    shipment.description ? `Description: ${shipment.description}` : null,
    shipment.cargo ? `Cargo: ${shipment.cargo}` : null,
    typeof shipment.quantity === "number" ? `Quantity: ${shipment.quantity}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const modelId = process.env.DELIVERY_PROOF_MODEL?.trim() ?? DEFAULT_MODEL;

  let verdict: z.infer<typeof VerdictSchema>;
  try {
    const { object } = await generateObject({
      model: google(modelId),
      schema: VerdictSchema,
      system:
        "You inspect photos of humanitarian relief deliveries. Decide if the visible goods match the shipment manifest and assess their overall condition. Be strict about visibly damaged, soaked, opened, or spilled goods (quality: poor). Reserve 'good' for clean, intact, clearly-matching cargo.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Manifest:\n${manifestSummary || "(no details provided)"}\n\nRoute: ${leg.fromNodeId} -> ${leg.toNodeId}. This is the driver's delivery photo. Assess match and quality.`,
            },
            { type: "image", image: photoBytes, mediaType },
          ],
        },
      ],
    });
    verdict = object;
  } catch (err) {
    console.error("[delivery-proof] Gemini verification failed", err);
    return NextResponse.json(
      {
        error:
          "Photo verification failed. Check your connection and try again within the window.",
      },
      { status: 502 },
    );
  }

  const quality: DeliveryQuality = verdict.quality;
  const flag = !verdict.matchesManifest || quality === "poor";

  const rationale = `AI verdict: ${verdict.matchesManifest ? "manifest match" : "manifest MISMATCH"}, quality=${quality}. ${verdict.rationale}`;

  const result = await finalizeLegAfterProof({
    shipment,
    leg,
    event,
    deviceId,
    timestamp: now,
    deliveryQuality: quality,
    matchesManifest: verdict.matchesManifest,
    proofNotes: rationale,
    flagShipment: flag,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      shipment: toShipmentJSON(result.shipment.toObject()),
      leg: toShipmentLegJSON(result.leg.toObject()),
      event: toTransferEventJSON(result.event.toObject()),
      fromNode: result.fromNode ? toNodeJSON(result.fromNode.toObject()) : null,
      toNode: result.toNode ? toNodeJSON(result.toNode.toObject()) : null,
      verdict: {
        matchesManifest: verdict.matchesManifest,
        quality,
        rationale: verdict.rationale,
        flagged: flag,
      },
    },
    { status: 201 },
  );
}
