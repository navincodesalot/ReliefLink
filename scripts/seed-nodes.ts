/**
 * Seed seed-only (hardware-less) origin nodes for ReliefLink.
 *
 * Run:
 *   pnpm tsx scripts/seed-nodes.ts
 *
 * These nodes only act as shipment STARTING POINTS. Real destinations are
 * Arduino-backed nodes added via the dashboard. Safe to re-run (upsert).
 */

import dns from "node:dns";
import mongoose from "mongoose";

import { connectDb } from "../src/lib/db";
import { NodeModel } from "../src/lib/models/Node";

const dnsServers = (process.env.DNS_SERVERS ?? "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers.length) {
  try {
    dns.setServers(dnsServers);
  } catch {
    // ignore — fall through to OS resolver
  }
}

type Seed = {
  nodeId: string;
  name: string;
  kind: "warehouse";
  lat: number;
  lng: number;
  address: string;
};

const SEEDS: Seed[] = [
  {
    nodeId: "un-brindisi",
    name: "UN Brindisi Logistics Base",
    kind: "warehouse",
    lat: 40.6395,
    lng: 17.9395,
    address: "Brindisi, Italy",
  },
  {
    nodeId: "un-dubai",
    name: "UN Humanitarian City Dubai",
    kind: "warehouse",
    lat: 25.1026,
    lng: 55.4085,
    address: "Dubai, UAE",
  },
  {
    nodeId: "un-accra",
    name: "UN Hub Accra",
    kind: "warehouse",
    lat: 5.6037,
    lng: -0.187,
    address: "Accra, Ghana",
  },
  {
    nodeId: "un-panama",
    name: "UN Hub Panama City",
    kind: "warehouse",
    lat: 9.017,
    lng: -79.5163,
    address: "Panama City, Panama",
  },
];

async function main() {
  await connectDb();
  console.log(`[seed] connected to db; seeding ${SEEDS.length} warehouses...`);

  for (const s of SEEDS) {
    const res = await NodeModel.findOneAndUpdate(
      { nodeId: s.nodeId },
      {
        $set: {
          nodeId: s.nodeId,
          name: s.name,
          kind: s.kind,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          hasHardware: false,
          active: true,
          pendingOnboarding: false,
        },
        $unset: { deviceId: "" },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    console.log(`  upserted ${res?.nodeId} (${res?.name})`);
  }

  await mongoose.disconnect();
  console.log("[seed] done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
