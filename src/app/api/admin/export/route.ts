import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/require-admin";
import { csvRow } from "@/lib/csv";
import { connectDb } from "@/lib/db";
import { FoodInventoryModel } from "@/lib/models/FoodInventory";
import { NodeModel } from "@/lib/models/Node";
import { Shipment } from "@/lib/models/Shipment";
import { ShipmentLeg } from "@/lib/models/ShipmentLeg";
import { TransferEvent } from "@/lib/models/TransferEvent";
import { flagStaleShipments } from "@/lib/transfer-logic";
import {
  toShipmentJSON,
  toShipmentLegJSON,
  toTransferEventJSON,
} from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SHIPMENTS_EXPORT = 10_000;

function fileStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource")?.trim();
  const format = searchParams.get("format")?.trim()?.toLowerCase();
  const slice = searchParams.get("slice")?.trim()?.toLowerCase();

  if (resource !== "trips" && resource !== "warehouse") {
    return NextResponse.json(
      { error: "Invalid resource. Use trips or warehouse." },
      { status: 400 },
    );
  }
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: "Invalid format. Use json or csv." },
      { status: 400 },
    );
  }

  await connectDb();

  if (resource === "trips") {
    await flagStaleShipments();
    const shipments = await Shipment.find()
      .sort({ lastUpdated: -1 })
      .limit(MAX_SHIPMENTS_EXPORT)
      .lean()
      .exec();
    const shipmentIds = shipments.map((s) => s.shipmentId);
    const [allLegs, allEvents] = await Promise.all([
      ShipmentLeg.find({ shipmentId: { $in: shipmentIds } })
        .sort({ shipmentId: 1, index: 1 })
        .lean()
        .exec(),
      TransferEvent.find({ shipmentId: { $in: shipmentIds } })
        .sort({ shipmentId: 1, timestamp: 1 })
        .lean()
        .exec(),
    ]);

    const legsByShipment = new Map<string, typeof allLegs>();
    const eventsByShipment = new Map<string, typeof allEvents>();
    for (const leg of allLegs) {
      const list = legsByShipment.get(leg.shipmentId) ?? [];
      list.push(leg);
      legsByShipment.set(leg.shipmentId, list);
    }
    for (const ev of allEvents) {
      const list = eventsByShipment.get(ev.shipmentId) ?? [];
      list.push(ev);
      eventsByShipment.set(ev.shipmentId, list);
    }

    const stamp = fileStamp();

    if (format === "json") {
      const trips = shipments.map((s) => {
        const sid = s.shipmentId;
        const legs = (legsByShipment.get(sid) ?? []).map((l) =>
          toShipmentLegJSON(l as Parameters<typeof toShipmentLegJSON>[0]),
        );
        const events = (eventsByShipment.get(sid) ?? []).map((e) =>
          toTransferEventJSON(e as Parameters<typeof toTransferEventJSON>[0]),
        );
        return {
          shipment: toShipmentJSON(s as Parameters<typeof toShipmentJSON>[0]),
          legs,
          events,
        };
      });
      const body = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          relieflinkExportVersion: 1,
          resource: "trips",
          tripCount: trips.length,
          trips,
        },
        null,
        2,
      );
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="relieflink-trips-${stamp}.json"`,
        },
      });
    }

    // CSV
    if (slice === "shipments" || !slice) {
      if (slice && slice !== "shipments") {
        return NextResponse.json(
          { error: "For trips CSV, slice must be shipments, legs, or events." },
          { status: 400 },
        );
      }
      const header = [
        "shipmentId",
        "description",
        "cargo",
        "quantity",
        "status",
        "originNodeId",
        "finalDestinationNodeId",
        "nodeRoute",
        "totalLegs",
        "completedLegs",
        "currentLegIndex",
        "currentHolderNodeId",
        "progressPct",
        "isFlagged",
        "solanaSignatures",
        "createdAt",
        "lastUpdated",
      ];
      let csv = csvRow(header);
      for (const s of shipments) {
        csv += csvRow([
          s.shipmentId,
          s.description ?? "",
          s.cargo ?? "",
          s.quantity ?? "",
          s.status,
          s.originNodeId,
          s.finalDestinationNodeId,
          (s.nodeRoute ?? []).join(";"),
          s.totalLegs ?? 0,
          s.completedLegs ?? 0,
          s.currentLegIndex ?? 0,
          s.currentHolderNodeId,
          s.progressPct ?? 0,
          s.isFlagged ? "true" : "false",
          (s.solanaSignatures ?? []).join(";"),
          (s.createdAt ?? new Date()).toISOString(),
          (s.lastUpdated ?? new Date()).toISOString(),
        ]);
      }
      return new NextResponse("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relieflink-trips-shipments-${stamp}.csv"`,
        },
      });
    }

    if (slice === "legs") {
      const header = [
        "shipmentId",
        "legIndex",
        "fromNodeId",
        "toNodeId",
        "driverDeviceId",
        "status",
        "estimatedDurationMinutes",
        "startedAt",
        "completedAt",
        "transferEventId",
        "solanaSignature",
        "deliveryQuality",
        "deliveryMatchesManifest",
        "proofSkippedReason",
        "deliveryProofNotes",
      ];
      let csv = csvRow(header);
      for (const leg of allLegs) {
        csv += csvRow([
          leg.shipmentId,
          leg.index,
          leg.fromNodeId,
          leg.toNodeId,
          leg.driverDeviceId ?? "",
          leg.status,
          leg.estimatedDurationMinutes ?? 45,
          leg.startedAt ? new Date(leg.startedAt).toISOString() : "",
          leg.completedAt ? new Date(leg.completedAt).toISOString() : "",
          leg.transferEventId ?? "",
          leg.solanaSignature ?? "",
          leg.deliveryQuality ?? "",
          typeof leg.deliveryMatchesManifest === "boolean"
            ? String(leg.deliveryMatchesManifest)
            : "",
          leg.proofSkippedReason ?? "",
          leg.deliveryProofNotes ?? "",
        ]);
      }
      return new NextResponse("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relieflink-trips-legs-${stamp}.csv"`,
        },
      });
    }

    if (slice === "events") {
      const header = [
        "shipmentId",
        "legIndex",
        "timestamp",
        "fromNodeId",
        "toNodeId",
        "deviceId",
        "source",
        "confirmed",
        "isAnomaly",
        "anomalyReason",
        "solanaSignature",
        "memoPayload",
        "notes",
      ];
      let csv = csvRow(header);
      for (const e of allEvents) {
        csv += csvRow([
          e.shipmentId,
          e.legIndex,
          (e.timestamp ?? new Date()).toISOString(),
          e.fromNodeId,
          e.toNodeId,
          e.deviceId,
          e.source,
          e.confirmed ? "true" : "false",
          e.isAnomaly ? "true" : "false",
          e.anomalyReason ?? "",
          e.solanaSignature ?? "",
          e.memoPayload ?? "",
          e.notes ?? "",
        ]);
      }
      return new NextResponse("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relieflink-trips-transfer-events-${stamp}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid slice for trips CSV." }, { status: 400 });
  }

  // warehouse
  const inventories = await FoodInventoryModel.find({}).lean().exec();
  const warehouseIds = inventories.map((i) => i.warehouseNodeId);
  const nodes = await NodeModel.find({ nodeId: { $in: warehouseIds } })
    .lean()
    .exec();
  const nameById = new Map(nodes.map((n) => [n.nodeId, n.name] as const));
  const stamp = fileStamp();

  if (format === "json") {
    const warehouses = inventories.map((inv) => ({
      warehouseNodeId: inv.warehouseNodeId,
      warehouseName: nameById.get(inv.warehouseNodeId) ?? null,
      need: inv.need ?? [],
      want: inv.want ?? [],
      have: inv.have ?? [],
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : null,
    }));
    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        relieflinkExportVersion: 1,
        resource: "warehouse",
        warehouseCount: warehouses.length,
        warehouses,
      },
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="relieflink-warehouse-inventory-${stamp}.json"`,
      },
    });
  }

  // warehouse CSV — one row per inventory line
  const header = [
    "warehouseNodeId",
    "warehouseName",
    "list",
    "item",
    "quantity",
    "unit",
    "inventoryUpdatedAt",
  ];
  let csv = csvRow(header);
  for (const inv of inventories) {
    const wname = nameById.get(inv.warehouseNodeId) ?? "";
    const updated =
      inv.updatedAt != null ? new Date(inv.updatedAt).toISOString() : "";
    for (const list of ["need", "want", "have"] as const) {
      const lines = inv[list] ?? [];
      for (const line of lines) {
        csv += csvRow([
          inv.warehouseNodeId,
          wname,
          list,
          line.item,
          line.quantity,
          line.unit ?? "",
          updated,
        ]);
      }
    }
  }
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relieflink-warehouse-inventory-${stamp}.csv"`,
    },
  });
}
