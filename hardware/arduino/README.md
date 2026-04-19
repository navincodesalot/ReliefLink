# Arduino Uno R3 — ReliefLink 2-board tap

ReliefLink anchors custody handoffs between nodes in a supply network. A
**driver** board (USB to the operator's laptop) and a battery-powered **store
beacon** share copper “tap” pads. The **driver** treats a tap as **5 V**
present on D2 (active-high); the **store** still uses pull-up and detects
contact as **LOW** on D2. Both boards see the same physical touch; the
**driver** emits `TAP` over USB serial, the **store** waits 3 seconds and
then buzzes.

The **USB bridge** (`usb-bridge/bridge.mjs`) on the field laptop forwards the
driver's `TAP` to `POST /api/transfer`. The server looks up the driver's
currently-assigned active leg and moves it into `awaiting_proof` — no
store identity ever travels on the wire.

**Delivery photo required.** A successful tap no longer finalizes the leg on
its own. The driver must open the PWA (`/driver`) and upload a photo of the
delivered goods within two minutes; the server runs Gemini Flash over the
image to verify the cargo matches the manifest and to grade its condition
(`good` / `acceptable` / `poor`), then anchors the handoff on Solana. If the
window lapses the leg is still marked delivered, but the shipment is flagged
for audit with a `photo missed` label.

| Board | Folder | Power | Sends |
| ----- | ------ | ----- | ----- |
| Driver tag | [`driver_tag/driver_tag.ino`](./driver_tag/driver_tag.ino) | USB (from laptop) | `TAP\n` on contact, then short ack beep on **D11** |
| Store beacon | [`store_beacon/store_beacon.ino`](./store_beacon/store_beacon.ino) | 9V battery | Optional Grove RGB LCD shows tap / countdown / done; buzzes after 3s |

## Wiring the shared tap

**Common GND** between the two Unos is required (same reference for the 5 V sense
on the driver and the store’s supply).

### Driver (`driver_tag.ino`)

- **D2** = `INPUT` — **not** `INPUT_PULLUP`.
- **10 kΩ** from **D2 → GND** so the pin is a solid **LOW** when the pads are
  open (Uno has no internal pull-down).
- One copper pad wires to **D2**; the other pad, on the store side, should
  present **5 V** when they touch so **D2 reads HIGH** → debounced `TAP`, then
  ack beep on D11.
- Tie **GND** to the store’s ground.

### Store (`store_beacon.ino`)

- **D2** = `INPUT_PULLUP` — contact that pulls the pad to **GND** reads as
  **LOW** (unchanged).

```
        Driver Uno                          Store Uno (battery)
        D2 ── pad A    ═══ touch ═══    pad B ── 5V (when wired that way)
         │                                    │
        10k                                    D2 (INPUT_PULLUP → GND when tap)
         │
        GND ═══════════════ common GND ═══════════════ GND
```

Mount pads so they only meet when pressed together. If D2 floats without the
10 kΩ pull-down, you will get garbage reads.

## Store Arduino — Grove RGB LCD + buzzer

Optional **Grove RGB LCD** on I2C (Base Shield or wired to **A4/A5**, **5V**,
**GND**). Set `RELIEFLINK_USE_GROVE_RGB_LCD` to `1` in
[`store_beacon.ino`](./store_beacon/store_beacon.ino) (default) or `0` if you
only want LED + buzzer.

Stages on the LCD:

- **Idle** — “ReliefLink” / “Ready — tap” (blue-ish backlight)
- **After tap** — “Tap received” / “Verify: Ns” countdown (amber)
- **After buzz** — “Handoff OK” / “Thank you” (green), then back to idle

- **D9** → passive piezo buzzer `+` (with a ~100Ω series resistor).
- **GND** → buzzer `-`.
- LED on **D13** flashes during the 3-second count, then stays on while the
  buzzer sounds.

The **driver** board has no LCD. It sends `TAP` over USB for the bridge, then
after ~280ms plays one passive-buzzer beep on **D11** so the operator hears
local confirmation (independent of the store beacon).

## USB bridge (driver laptop)

**Node.js 20+**.

```bash
cd hardware/arduino/usb-bridge
pnpm install
cp env.example .env
```

`.env` essentials:

- `RELIEFLINK_API_URL` — full URL to `/api/transfer` (e.g.
  `http://localhost:3000/api/transfer` or your deployed URL).
- `TRANSFER_SECRET` — matches the server (HMAC for `/api/transfer` and for the
  device-register header).
- `DEVICE_ID` — the identifier the admin binds to a shipment leg in the UI.
  This is the only thing that identifies the driver to the server.
- `SERIAL_PORT` — e.g. `COM5` on Windows (omit once to list ports).

```bash
pnpm start
```

On startup the bridge POSTs `{"deviceId": "..."}` to
`POST /api/devices/register` so unknown devices surface in the dashboard as
"pending" nodes — the admin can then promote them to real nodes on the map.

Each `TAP\n` line from the Arduino results in one signed
`POST /api/transfer` call. If the device has no active leg assigned, the
server returns 404 and the bridge logs that.
