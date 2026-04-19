# Arduino Uno R3 — ReliefLink 2-board tap

ReliefLink anchors custody handoffs between nodes in a supply network. A
**driver** board (USB to the operator's laptop) and a battery-powered **store
beacon** share a single copper "tap" line: touching the two copper pads
completes a circuit to their common GND. Both boards detect the contact; the
**driver** emits `TAP` over USB serial, the **store** waits 3 seconds and
then buzzes.

The **USB bridge** (`usb-bridge/bridge.mjs`) on the field laptop forwards the
driver's `TAP` to `POST /api/transfer`. The server looks up the driver's
currently-assigned active leg and signs the handoff on Solana testnet — no
store identity ever travels on the wire.

| Board | Folder | Power | Sends |
| ----- | ------ | ----- | ----- |
| Driver tag | [`driver_tag/driver_tag.ino`](./driver_tag/driver_tag.ino) | USB (from laptop) | `TAP\n` over serial on contact |
| Store beacon | [`store_beacon/store_beacon.ino`](./store_beacon/store_beacon.ino) | 9V battery | nothing — buzzes after 3s |

## Wiring the shared tap

Both boards share **one** ground and one copper pad each. Bringing the two
pads into contact closes the circuit to their common GND:

```
Driver Uno   D2 ─────┐                     ┌───── D2   Store Uno
(USB power)          │   copper pads       │         (battery power)
           GND ──────┴────────[ GND bus ]──┴────── GND
```

- **D2** on each board uses `INPUT_PULLUP` — pressed / in contact = `LOW`.
- **Common GND** is essential; without it the two boards can't agree that the
  copper pads are at the same potential.
- Mount the pads a few millimetres apart so they only complete the circuit
  when pressed together.

## Driver Arduino — optional Grove RGB LCD

If you use the Grove Base Shield + LCD, leave `RELIEFLINK_USE_GROVE_RGB_LCD 1`
in [`driver_tag.ino`](./driver_tag/driver_tag.ino). The bridge can send:

```
>0,First line text
>1,Second line
```

Set the define to `0` if no LCD is attached — the tap behavior is unchanged.

## Store Arduino — buzzer

- **D9** → passive piezo buzzer `+` (with a ~100Ω series resistor).
- **GND** → buzzer `-`.
- Optional LED on **D13** flashes during the 3-second count then stays on
  while the buzzer sounds.

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
