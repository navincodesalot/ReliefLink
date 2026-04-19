/**
 * ReliefLink USB bridge — driver Arduino (USB) → POST /api/transfer
 *
 * Driver board emits `TAP\n` on every debounced contact closure. The bridge
 * forwards that to the server with an HMAC-signed JSON body containing only
 * the configured `deviceId`. The server resolves the destination from the
 * driver's currently-assigned active shipment leg.
 *
 * Run: pnpm start  (Node 20+, uses --env-file=.env)
 */

import { createHmac } from "node:crypto";
import { ReadlineParser } from "@serialport/parser-readline";
import { SerialPort } from "serialport";

const TRANSFER_URL = process.env.RELIEFLINK_API_URL?.trim();
const SECRET = process.env.TRANSFER_SECRET?.trim();
const DEVICE_ID = process.env.DEVICE_ID?.trim();
const SERIAL_PATH = process.env.SERIAL_PORT?.trim();
const BAUD = Number(process.env.SERIAL_BAUD ?? "115200");
/** Minimum ms between accepted TAP lines (bridge-side debounce on top of firmware). */
const TAP_COOLDOWN_MS = Number(process.env.TAP_COOLDOWN_MS ?? "1500");

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

requireEnv("RELIEFLINK_API_URL", TRANSFER_URL);
requireEnv("TRANSFER_SECRET", SECRET);
requireEnv("DEVICE_ID", DEVICE_ID);

function siblingUrl(transferUrl, path) {
  const u = new URL(transferUrl);
  u.pathname = path;
  u.search = "";
  return u.href;
}

async function registerDevice() {
  const url = siblingUrl(TRANSFER_URL, "/api/devices/register");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relieflink-secret": SECRET,
      },
      body: JSON.stringify({ deviceId: DEVICE_ID }),
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

async function postTransfer() {
  const body = JSON.stringify({ deviceId: DEVICE_ID });
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
    console.log(`[relieflink] POST /api/transfer ${res.status} ${text.slice(0, 400)}`);
    return res.ok;
  } catch (err) {
    console.error(`[relieflink] transfer network error: ${err?.message ?? err}`);
    return false;
  }
}

let lastTapAcceptedMs = 0;
let tapBusy = false;

async function onTap() {
  const now = Date.now();
  if (tapBusy) return;
  if (now - lastTapAcceptedMs < TAP_COOLDOWN_MS) {
    console.log("[relieflink] tap within cooldown, ignoring");
    return;
  }
  lastTapAcceptedMs = now;
  tapBusy = true;
  try {
    await postTransfer();
  } finally {
    tapBusy = false;
  }
}

async function main() {
  if (!SERIAL_PATH) {
    const list = await SerialPort.list();
    console.error(
      "Set SERIAL_PORT to your Arduino COM port (Windows) or /dev/ttyUSB0, etc.",
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
    if (line === "TAP") {
      console.log("[relieflink] TAP received");
      void onTap();
      return;
    }
    console.log(`[relieflink] arduino: ${line}`);
  });

  port.on("error", (err) => {
    console.error(`[relieflink] serial error: ${err.message}`);
  });

  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });

  console.log(
    `[relieflink] USB bridge ${DEVICE_ID} on ${SERIAL_PATH} @ ${BAUD} → ${TRANSFER_URL}`,
  );

  await registerDevice();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
