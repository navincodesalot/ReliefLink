/**
 * Seed demo MongoDB users for ReliefLink. Login has been removed in-app, so the
 * password hash stored here is only a placeholder and is never checked.
 *
 *   pnpm seed:users
 */

import dns from "node:dns";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDb } from "../src/lib/db";
import { UserModel } from "../src/lib/models/User";

const dnsServers = (process.env.DNS_SERVERS ?? "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers.length) {
  try {
    dns.setServers(dnsServers);
  } catch {
    // ignore
  }
}

const DEMO_PASSWORD = process.env.RELIEFLINK_SEED_PASSWORD ?? "ReliefLink#2026";

type Seed = {
  email: string;
  name: string;
  role: "admin" | "warehouse" | "driver";
  warehouseNodeId?: string;
  driverDeviceId?: string;
};

const STAFF: Seed[] = [
  {
    email: "admin@relieflink.demo",
    name: "UN Administrator",
    role: "admin",
  },
  {
    email: "warehouse@relieflink.demo",
    name: "UN Food Bank (Brindisi)",
    role: "warehouse",
    warehouseNodeId: "un-brindisi",
  },
];

const DRIVER_NAMES = [
  "Field Driver",
  "Maria Rossi",
  "Aarav Patel",
  "Noah Chen",
  "Fatima Al-Hassan",
  "Luca Moretti",
  "Priya Sharma",
  "Diego Fernández",
  "Amara Okafor",
  "Yuki Tanaka",
  "Hana Kim",
  "Omar Haddad",
  "Isabela Souza",
  "Sven Lindqvist",
  "Ananya Iyer",
  "Jonas Weber",
  "Chiamaka Eze",
  "Leila Darvishian",
  "Matteo Bianchi",
  "Sofia Martinez",
];

function driverSeed(index: number, name: string): Seed {
  const deviceId = index === 0 ? "driver-demo-01" : `driver-seed-${String(index).padStart(3, "0")}`;
  const emailLocal =
    index === 0
      ? "driver"
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "") || `driver-${index}`;
  return {
    email: `${emailLocal}@relieflink.demo`,
    name,
    role: "driver",
    driverDeviceId: deviceId,
  };
}

async function main() {
  await connectDb();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const drivers = DRIVER_NAMES.map((name, i) => driverSeed(i, name));
  const users: Seed[] = [...STAFF, ...drivers];

  for (const u of users) {
    await UserModel.findOneAndUpdate(
      { email: u.email },
      {
        email: u.email,
        passwordHash: hash,
        name: u.name,
        role: u.role,
        ...(u.role === "warehouse" ? { warehouseNodeId: u.warehouseNodeId } : {}),
        ...(u.role === "driver" ? { driverDeviceId: u.driverDeviceId } : {}),
      },
      { upsert: true, new: true },
    );
    console.log(`[seed-users] upserted ${u.role}: ${u.email}`);
  }

  console.log(
    `[seed-users] done. Seeded ${users.length} users (${drivers.length} drivers). Login is disabled in this demo.`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
