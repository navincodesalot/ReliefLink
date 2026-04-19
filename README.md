# ReliefLink

Verified **chain of custody** for disaster food aid. Handoffs between warehouse, transporter, and local nodes are confirmed with an **Arduino Uno (two buttons)** on a **field laptop over USB serial**, logged in **MongoDB**, and anchored on **Solana testnet** via memo transactions.

## Stack

- **Web:** Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui — deploy on Vercel.
- **Data:** MongoDB Atlas, database name **`relieflink`** (set by the app; your URI can omit path or include `/relieflink`).
- **Chain:** Solana **testnet** — `@solana/web3.js` + SPL Memo (no custom on-chain program).
- **Hardware:** Arduino Uno R3 (D2/D3) + Node USB bridge on the field machine — [hardware/arduino/README.md](./hardware/arduino/README.md).
- **Voice (optional):** Echo Dot via Voice Monkey / IFTTT → `/api/voice` — [hardware/alexa/README.md](./hardware/alexa/README.md).

## Run locally

1. Copy [`.env.example`](./.env.example) → `.env` and fill in values.
2. Fund the signer on testnet:  
   `solana airdrop 1 <WALLET_A_PUBLIC> --url https://api.testnet.solana.com`
3. `pnpm install` && `pnpm dev` → <http://localhost:3000>

**Note:** If you used an older build, data may have lived in a MongoDB database named `foodtrust`. This app now uses **`relieflink`** — migrate data or recreate batches.

### Web UI demo logins (MongoDB only)

Sign-in is **not** configured via `.env` passwords. Users live in MongoDB (`User` collection). After `MONGODB_URI` is set, run:

```bash
pnpm seed:users
```

That upserts three demo accounts. **Same password for all** (unless you set `RELIEFLINK_SEED_PASSWORD` in `.env` before seeding):

| Role | Email | Password (default) | Notes |
| --- | --- | --- | --- |
| UN administrator | `admin@relieflink.demo` | `ReliefLink#2026` | `/login/admin` → `/admin` |
| Warehouse / food bank | `warehouse@relieflink.demo` | `ReliefLink#2026` | Linked to warehouse node `un-brindisi` (seed nodes first: `pnpm seed`) |
| Driver | `driver@relieflink.demo` | `ReliefLink#2026` | Device id `driver-demo-01` on the account |

**Public** Solana ledger: open **`/track`** — no login.

Re-run `pnpm seed:users` any time to reset these passwords to the current `RELIEFLINK_SEED_PASSWORD` or the default above.

## Deploy (Vercel)

Set the same variables as in `.env.example` in the Vercel project. On the **field laptop**, the USB bridge uses the same `TRANSFER_SECRET`, `TRANSFER_PIN` (if used), `RELIEFLINK_API_URL`, and a stable **`DEVICE_ID`**. Map each device to **batch + from + to** in the app under **Handoff stations** (`/stations`) — not in the bridge `.env`.

## API

| Method | Path                | Purpose                                               |
| ------ | ------------------- | ----------------------------------------------------- |
| `POST` | `/api/batch/create` | New batch; origin is first custodian.                 |
| `POST` | `/api/transfer`     | Handoff; HMAC + optional PIN; Solana memo on success. |
| `POST` | `/api/voice`        | Webhook for Alexa (token query or secret header).     |
| `GET`  | `/api/batches`      | List batches.                                         |
| `GET`  | `/api/batch/[id]`   | Batch + timeline.                                     |
| `GET`  | `/api/handoff-stations` | List field devices (open for dashboard).            |
| `GET`  | `/api/handoff-station/[deviceId]` | Assignment for one device (`x-relieflink-secret`, used by USB bridge). |
| `PUT`  | `/api/handoff-station/[deviceId]` | Set batch + roles (open for dashboard; add auth if you expose publicly). |

### Auth headers

- `x-relieflink-signature`: hex **HMAC-SHA256** of the **raw** JSON body with `TRANSFER_SECRET` (what the USB bridge sends).
- `x-relieflink-secret`: raw `TRANSFER_SECRET` (dev convenience for `/api/transfer`, and for **`GET /api/handoff-station/[deviceId]`** only — the USB bridge uses it to fetch assignment).

If **`TRANSFER_PIN`** is set on the server, JSON must include **`pin`** (`1` / `2` only), matching exactly.

### Anomalies

Wrong `from` vs current holder, stale `STALE_MS`, bad PIN → flagged or rejected; invalid custody moves do not get a Solana memo.

## Demo checklist

1. Create a batch in the UI (dashboard machine).
2. Open **Handoff stations** and assign your board’s `DEVICE_ID` to that batch and the next `from` → `to` roles.
3. On the field laptop, run the USB bridge; enter the PIN on the Arduino → `POST /api/transfer` → timeline + Solana explorer link on refresh.
4. Wrong PIN or wrong holder → failure / flag.
5. (Optional) Voice Monkey routine with same JSON + `pin`.

## Repo layout

- `src/app` — dashboard + route handlers
- `src/lib` — DB models, Solana memo, PIN verify, HMAC auth
- `hardware/arduino` — Uno firmware + USB serial bridge
- `hardware/alexa` — Echo integration
