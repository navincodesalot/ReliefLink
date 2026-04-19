/**
 * ReliefLink USB bridge — store Arduino (USB serial) → POST /api/transfer
 *
 * Store firmware (`store_beacon.ino`) sends:
 *   RELIEFLINK_STORE_READY id=<12 hex> firstProvision=0|1 firstOnline=0|1
 *   RELIEFLINK_STORE_FIRST_ONLINE id=<12 hex>   (once per device lifetime)
 *   RELIEFLINK_TAP id=<12 hex> t=<millis>       (after buzzer — handoff)
 *
 * The bridge registers the store id with POST /api/devices/register on READY,
 * then forwards each TAP with HMAC body { deviceId } (same id). The server
 * resolves the active leg by destination node's deviceId (or legacy driver
 * deviceId).
 *
 * Optional: DEVICE_ID in .env — if the board emits a bare `TAP` line, that
 * value is used (legacy driver firmware).
 *
 * Run: pnpm start  (Node 20+, uses --env-file=.env)
 */

import { createHmac } from "node:crypto";
import { ReadlineParser } from "@serialport/parser-readline";
import { SerialPort } from "serialport";

const TRANSFER_URL = process.env.RELIEFLINK_API_URL?.trim();
const SECRET = process.env.TRANSFER_SECRET?.trim();
const DEVICE_ID_FALLBACK = process.env.DEVICE_ID?.trim();
const SERIAL_PATH = process.env.SERIAL_PORT?.trim();
const BAUD = Number(process.env.SERIAL_BAUD ?? "115200");
const TAP_COOLDOWN_MS = Number(process.env.TAP_COOLDOWN_MS ?? "1500");

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

requireEnv("RELIEFLINK_API_URL", TRANSFER_URL);
requireEnv("TRANSFER_SECRET", SECRET);

function siblingUrl(transferUrl, path) {
  const u = new URL(transferUrl);
  u.pathname = path;
  u.search = "";
  return u.href;
}

const RE_READY =
  /^RELIEFLINK_STORE_READY id=([0-9a-f]{12}) firstProvision=([01]) firstOnline=([01])$/;
const RE_FIRST = /^RELIEFLINK_STORE_FIRST_ONLINE id=([0-9a-f]{12})$/;
const RE_TAP = /^RELIEFLINK_TAP id=([0-9a-f]{12}) t=(\d+)$/;

async function registerDevice(deviceId) {
  const url = siblingUrl(TRANSFER_URL, "/api/devices/register");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relieflink-secret": SECRET,
      },
      body: JSON.stringify({ deviceId }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(
        `[relieflink] register ${res.status}: ${text.slice(0, 160)}`,
      );
      return null;
    }
    console.log(`[relieflink] register: ${text.slice(0, 240)}`);
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err) {
    console.warn(`[relieflink] register error: ${err?.message ?? err}`);
    return null;
  }
}

async function postTransfer(deviceId) {
  const body = JSON.stringify({ deviceId });
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");

  try {
    const res = await fetch(TRANSFER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relieflink-signature": sig,
      },
      body,
    });
    const text = await res.text();
    console.log(
      `[relieflink] POST /api/transfer ${res.status} ${text.slice(0, 400)}`,
    );
    return res.ok;
  } catch (err) {
    console.error(`[relieflink] transfer network error: ${err?.message ?? err}`);
    return false;
  }
}

let lastTapAcceptedMs = 0;
let tapBusy = false;

async function onTap(deviceId) {
  const now = Date.now();
  if (tapBusy) return;
  if (now - lastTapAcceptedMs < TAP_COOLDOWN_MS) {
    console.log("[relieflink] tap within cooldown, ignoring");
    return;
  }
  lastTapAcceptedMs = now;
  tapBusy = true;
  try {
    await postTransfer(deviceId);
  } finally {
    tapBusy = false;
  }
}

function handleLine(line) {
  const ready = line.match(RE_READY);
  if (ready) {
    const id = ready[1];
    const firstProvision = ready[2] === "1";
    const firstOnline = ready[3] === "1";
    console.log(
      `[relieflink] STORE_READY id=${id} firstProvision=${firstProvision} firstOnline=${firstOnline}`,
    );
    void registerDevice(id);
    return;
  }

  const first = line.match(RE_FIRST);
  if (first) {
    console.log(`[relieflink] STORE_FIRST_ONLINE id=${first[1]}`);
    void registerDevice(first[1]);
    return;
  }

  const tap = line.match(RE_TAP);
  if (tap) {
    console.log(`[relieflink] TAP id=${tap[1]} t=${tap[2]}`);
    void onTap(tap[1]);
    return;
  }

  if (line === "TAP" && DEVICE_ID_FALLBACK) {
    console.log(`[relieflink] legacy TAP → deviceId from env`);
    void onTap(DEVICE_ID_FALLBACK);
    return;
  }

  console.log(`[relieflink] serial: ${line}`);
}

async function main() {
  if (!SERIAL_PATH) {
    const list = await SerialPort.list();
    console.error(
      "Set SERIAL_PORT to your store Arduino COM port (Windows) or /dev/ttyUSB0, etc.",
    );
    console.error("Available ports:");
    for (const p of list) {
      console.error(`  ${p.path}${p.manufacturer ? ` — ${p.manufacturer}` : ""}`);
    }
    process.exit(1);
  }

  const port = new SerialPort({
    path: SERIAL_PATH,
    baudRate: BAUD,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", (raw) => {
    const line = String(raw).replace(/\r/g, "").trim();
    if (!line) return;
    handleLine(line);
  });

  port.on("error", (err) => {
    console.error(`[relieflink] serial error: ${err.message}`);
  });

  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });

  console.log(
    `[relieflink] USB bridge (store) on ${SERIAL_PATH} @ ${BAUD} → ${TRANSFER_URL}`,
  );
  if (DEVICE_ID_FALLBACK) {
    console.log(
      `[relieflink] DEVICE_ID fallback set (legacy bare TAP only): ${DEVICE_ID_FALLBACK}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
