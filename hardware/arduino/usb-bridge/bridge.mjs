/**
 * ReliefLink USB bridge — Arduino Uno (USB serial) → HTTPS POST /api/transfer
 *
 * Batch / from / to come from GET /api/handoff-station/:deviceId (configured in UI).
 * The bridge pushes two-line status to the Uno for a Grove RGB LCD (see firmware).
 *
 * Run: pnpm start   (Node 20+, uses --env-file=.env)
 */

import { createHmac } from "node:crypto";
import { ReadlineParser } from "@serialport/parser-readline";
import { SerialPort } from "serialport";

const API_URL = process.env.RELIEFLINK_API_URL?.trim();
const SECRET = process.env.TRANSFER_SECRET?.trim();
const DEVICE_ID = process.env.DEVICE_ID?.trim();
const EXPECTED_PIN = process.env.TRANSFER_PIN?.trim() ?? "";
const SERIAL_PATH = process.env.SERIAL_PORT?.trim();
const BAUD = Number(process.env.SERIAL_BAUD ?? "115200");
/** Max pause between PIN digits before buffer clears (ms). Use 60000+ if you type slowly. */
const PIN_IDLE_MS = Number(process.env.PIN_IDLE_MS ?? "60000");
const ASSIGNMENT_POLL_MS = Number(process.env.ASSIGNMENT_POLL_MS ?? "8000");

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

requireEnv("RELIEFLINK_API_URL", API_URL);
requireEnv("TRANSFER_SECRET", SECRET);
requireEnv("DEVICE_ID", DEVICE_ID);

function assignmentUrl(transferUrl, deviceId) {
  const u = new URL(transferUrl);
  u.pathname = `/api/handoff-station/${encodeURIComponent(deviceId)}`;
  u.search = "";
  return u.href;
}

function truncate(s, n) {
  const t = String(s ?? "");
  return t.length <= n ? t : t.slice(0, n);
}

/** Host → Arduino: lines `>0,text` and `>1,text` (16 chars max per line). */
function lcdLines(port, line0, line1) {
  return new Promise((resolve, reject) => {
    const lines = [`>0,${truncate(line0, 16)}`, `>1,${truncate(line1, 16)}`];
    let i = 0;
    function next(err) {
      if (err) return reject(err);
      if (i >= lines.length) return resolve();
      port.write(`${lines[i]}\n`, (e) => {
        if (e) return reject(e);
        i++;
        setTimeout(() => next(null), 35);
      });
    }
    next(null);
  });
}

async function fetchAssignment() {
  try {
    const url = assignmentUrl(API_URL, DEVICE_ID);
    const res = await fetch(url, {
      headers: { "x-relieflink-secret": SECRET },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[relieflink] assignment GET ${res.status}`, text.slice(0, 300));
      return null;
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[relieflink] assignment: bad JSON", text.slice(0, 200));
      return null;
    }
    if (json?.configured) {
      console.log(
        `[relieflink] assignment OK  batch=${json.batchId}  ${json.from} → ${json.to}`,
      );
    } else {
      console.warn(
        `[relieflink] assignment empty for DEVICE_ID=${DEVICE_ID} — open app /stations, add row, Save (same secret as Vercel).`,
      );
    }
    return json;
  } catch (e) {
    console.error("[relieflink] assignment fetch error:", e?.message ?? e);
    return null;
  }
}

function buildBody(assignment, pin) {
  const o = {
    batchId: assignment.batchId,
    from: assignment.from,
    to: assignment.to,
    deviceId: DEVICE_ID,
  };
  if (pin) o.pin = pin;
  return JSON.stringify(o);
}

async function postTransfer(port, assignment, pin) {
  const body = buildBody(assignment, pin);
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");
  await lcdLines(port, "Sending…", truncate(assignment.batchId, 16));
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-relieflink-signature": sig,
    },
    body,
  });
  const text = await res.text();
  console.log(`[relieflink] HTTP ${res.status} ${text.slice(0, 400)}`);
  if (res.ok) {
    await lcdLines(port, "Handoff OK", `HTTP ${res.status}`);
  } else {
    await lcdLines(port, "Error", `HTTP ${res.status}`);
  }
  return res.ok;
}

let pinBuffer = "";
let lastDigitMs = 0;
/** @type {SerialPort | null} */
let portRef = null;

async function refreshAssignmentLcd(reason) {
  const port = portRef;
  if (!port) return;
  const a = await fetchAssignment();
  if (!a?.configured) {
    await lcdLines(
      port,
      "Not assigned",
      reason === "poll" ? "Open /stations" : "Configure UI",
    );
    return;
  }
  const line0 = truncate(a.displayName || a.batchId, 16);
  const line1 = truncate(`${a.from}→${a.to}`, 16);
  await lcdLines(port, line0, line1);
}

function onDigitLine(line) {
  const port = portRef;
  const t = line.trim();
  if (t !== "1" && t !== "2") return;

  const now = Date.now();
  pinBuffer += t;
  lastDigitMs = now;
  console.log(
    `[relieflink] buffer ${pinBuffer} (${pinBuffer.length}${EXPECTED_PIN ? `/${EXPECTED_PIN.length}` : ""})`,
  );

  if (port) {
    void lcdLines(
      port,
      "PIN",
      `${pinBuffer.length}${EXPECTED_PIN ? `/${EXPECTED_PIN.length}` : ""} chars`,
    );
  }

  if (EXPECTED_PIN) {
    if (pinBuffer.length >= EXPECTED_PIN.length) {
      const attempt = pinBuffer.slice(0, EXPECTED_PIN.length);
      pinBuffer = "";
      lastDigitMs = 0;
      if (attempt === EXPECTED_PIN) {
        console.log("[relieflink] PIN OK, resolving assignment…");
        void (async () => {
          const a = await fetchAssignment();
          if (!portRef) return;
          if (!a?.configured) {
            console.error("[relieflink] station not configured in UI");
            await lcdLines(portRef, "Not assigned", "/stations");
            return;
          }
          await postTransfer(portRef, a, attempt);
          await refreshAssignmentLcd("after-post");
        })();
      } else {
        console.log("[relieflink] wrong PIN");
        if (port) void lcdLines(port, "Wrong PIN", "Try again");
      }
    }
  }
}

function tickPinIdle() {
  const port = portRef;
  if (pinBuffer.length === 0 || lastDigitMs === 0) return;
  if (Date.now() - lastDigitMs <= PIN_IDLE_MS) return;

  const buf = pinBuffer;
  pinBuffer = "";
  lastDigitMs = 0;

  if (EXPECTED_PIN) {
    console.log("[relieflink] PIN idle timeout, clearing buffer");
    if (port) void lcdLines(port, "Timeout", "Cleared");
    return;
  }

  console.log("[relieflink] PIN idle, posting…");
  void (async () => {
    const a = await fetchAssignment();
    if (!portRef) return;
    if (!a?.configured) {
      await lcdLines(portRef, "Not assigned", "/stations");
      return;
    }
    await postTransfer(portRef, a, buf);
    await refreshAssignmentLcd("after-post");
  })();
}

async function main() {
  if (!SERIAL_PATH) {
    const list = await SerialPort.list();
    console.error(
      "Set SERIAL_PORT to your Arduino COM port (Windows) or /dev/ttyUSB0, etc.\nAvailable ports:",
    );
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
  portRef = port;

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", (line) => {
    onDigitLine(String(line));
  });

  port.on("error", (err) => {
    console.error("[relieflink] serial error:", err.message);
  });

  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });

  console.log(
    `[relieflink] USB bridge ${DEVICE_ID} on ${SERIAL_PATH} @ ${BAUD} → ${API_URL}`,
  );
  if (EXPECTED_PIN) {
    console.log(
      `[relieflink] TRANSFER_PIN length ${EXPECTED_PIN.length} (must match server). Enter all digits within ${PIN_IDLE_MS}ms pauses or buffer clears.`,
    );
  } else {
    console.log(
      "[relieflink] No TRANSFER_PIN on bridge: will POST accumulated digits after idle (server may still require PIN).",
    );
  }

  await lcdLines(port, "ReliefLink", "Starting…");
  await refreshAssignmentLcd("startup");

  setInterval(tickPinIdle, 500);
  setInterval(() => void refreshAssignmentLcd("poll"), ASSIGNMENT_POLL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
