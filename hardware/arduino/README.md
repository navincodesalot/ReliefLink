# Arduino Uno R3 — ReliefLink handoff (USB serial)

## What you are building

ReliefLink records **custody handoffs**. The **Arduino does not use the network**. It sends button presses (`1` / `2`) over **USB serial**. The **Grove RGB LCD** (I2C, via **Grove Base Shield**) shows status lines sent by the field laptop.

The **USB bridge** (`usb-bridge/bridge.mjs`) on the field laptop:

1. Reads serial lines from the Uno.
2. **Polls** `GET /api/handoff-station/:deviceId` (same `TRANSFER_SECRET` header) for **batch + from + to** assigned in the dashboard (**Handoff stations** page).
3. When the PIN is complete, **`POST /api/transfer`** with HMAC on the JSON body.

So **batch and roles are not fixed in `.env`** — you set them per physical board in the UI.

| Machine | Role |
| ------- | ---- |
| **Dashboard** | Create batches, open **Handoff stations** (`/stations`), map each `DEVICE_ID` to batch + `from` → `to`. |
| **Field** | Run the bridge + Arduino; bridge fetches the latest assignment before each handoff. |

## Wiring — buttons

| Button | Arduino Uno |
| ------ | ----------- |
| Button 1 | **D2** and **GND** (INPUT_PULLUP, pressed = LOW) |
| Button 2 | **D3** and **GND** |

## Wiring — Grove LCD RGB backlight + Base Shield

- Mount the **Grove Base Shield** on the Uno; plug the **Grove LCD RGB backlight** into an **I2C** Grove socket on the shield (the shield routes I2C to **A4/A5**).
- Library: **Grove - LCD RGB backlight** (`rgb_lcd.h`) — already the default in [`relieflink_handoff_uno.ino`](./relieflink_handoff_uno/relieflink_handoff_uno.ino) (`RELIEFLINK_USE_GROVE_RGB_LCD` **1**). Set that define to **0** only if you run without the LCD.

Host → Uno text protocol (115200 baud), one line per command:

- `>0,First line text\n` — row 0 (max 16 characters used)
- `>1,Second line\n` — row 1

The bridge sends these automatically (assignment summary, PIN progress, HTTP result).

## Firmware

[`relieflink_handoff_uno/relieflink_handoff_uno.ino`](./relieflink_handoff_uno/relieflink_handoff_uno.ino)

1. Open the folder in Arduino IDE, board **Arduino Uno**, select COM port, upload.
2. LCD is on by default with the Grove shield; disable in the sketch only if you remove the module.

## USB bridge (field laptop)

**Node.js 20+**.

```bash
cd hardware/arduino/usb-bridge
pnpm install
cp env.example .env
```

**`.env` essentials**

- `RELIEFLINK_API_URL` — full URL to `/api/transfer`.
- `TRANSFER_SECRET` — matches the server (HMAC + station API).
- `TRANSFER_PIN` — same as server when PIN is enforced.
- `DEVICE_ID` — same string you register on **`/stations`**.
- `SERIAL_PORT` — e.g. `COM5` on Windows (omit once to list ports).
- `ASSIGNMENT_POLL_MS` — how often to refresh LCD from UI (default `8000`).

```bash
pnpm start
```

After you **Save** a station row in the UI, the bridge picks it up on the next poll or right before posting.

## API

- **`GET /api/handoff-station/[deviceId]`** — assignment for the bridge; header `x-relieflink-secret: TRANSFER_SECRET`.
- **`PUT /api/handoff-station/[deviceId]`** — set assignment from the dashboard (no secret).
- **`GET /api/handoff-stations`** — list stations for the dashboard (no secret).
- **`POST /api/transfer`** — unchanged; body still `batchId`, `from`, `to`, `deviceId`, `pin`; HMAC signing.

See the root [README.md](../../README.md) for custody rules and Solana.
