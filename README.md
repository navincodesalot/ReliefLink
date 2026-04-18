# FoodTrust

Verified chain-of-custody for disaster food aid. Each handoff between
warehouse, transporter, and local node is physically confirmed on a Raspberry
Pi 4, logged in MongoDB, and anchored on Solana testnet as tamper-evident
proof.

## Stack

- **Web**: Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui, deployed on
  Vercel.
- **Data**: MongoDB Atlas (`Batch`, `TransferEvent` collections).
- **Blockchain**: Solana testnet — `@solana/web3.js` + SPL Memo. We do *not*
  run a custom program. Each valid transfer submits a memo transaction whose
  payload encodes the handoff, and the returned signature is stored on the
  event for a one-click explorer link.
- **Hardware**: one Raspberry Pi 4 per node, WiFi → HTTPS, HMAC-signed
  transfers, local `espeak` confirmation. Optional Amazon Echo Dot via an
  Alexa Routine → webhook.

## Running locally

1. Copy [`.env.example`](./.env.example) to `.env` and fill in values:
   - `MONGODB_URI` — Atlas connection string.
   - `TRANSFER_SECRET` — shared secret for Pi and voice webhooks.
   - `TRANSFER_PIN` — optional; if set, every `/api/transfer` and `/api/voice` body must include matching `pin` (`1`/`2` only, e.g. `121212`). Use the same value on each Pi.
   - `STALE_MS` — how long a batch can idle before being flagged (120000 = 2 min is good for demos).
   - `SOLANA_RPC_URL=https://api.testnet.solana.com`
   - `WALLET_A_PUBLIC` / `WALLET_A_SECRET` — signer (needs testnet SOL).
   - `WALLET_B_PUBLIC` — optional custody counterparty; included in each memo tx so the explorer history shows both wallets.
2. Fund the signer on testnet:
   ```bash
   solana airdrop 1 "$WALLET_A_PUBLIC" --url https://api.testnet.solana.com
   ```
3. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```
4. Open <http://localhost:3000>.

## Production deploy

- Push to GitHub and import into Vercel.
- Add the same env vars in the Vercel project (set for *Production* and *Preview*).
- MongoDB Atlas: allow `0.0.0.0/0` or Vercel's outbound IPs for the hackathon.
- Redeploy. The Pi's `API_BASE_URL` should point at the Vercel URL.

## API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/batch/create` | Register a new batch; origin becomes initial custodian. |
| `POST` | `/api/transfer`     | Record a handoff. Requires HMAC header or shared secret. Runs anomaly rules, writes Solana memo on success. |
| `POST` | `/api/voice`        | Simplified webhook for Alexa Routines / IFTTT (shared-secret token, same logic). |
| `GET`  | `/api/batches`      | Dashboard list, newest first. |
| `GET`  | `/api/batch/[id]`   | Batch detail + full transfer timeline. |

### Auth

`/api/transfer` accepts either:

- `x-foodtrust-signature: <hex sha256 hmac of raw body with TRANSFER_SECRET>` (preferred, what the Pi sends), or
- `x-foodtrust-secret: <TRANSFER_SECRET>` (dev convenience).

If **`TRANSFER_PIN`** is set in the server environment, the JSON body must include **`pin`** — a string of only `1` and `2` matching `TRANSFER_PIN` exactly (same pattern as the two physical buttons on the Pi). If `TRANSFER_PIN` is unset, `pin` is optional.

### Anomaly rules

- Transfer rejected as anomaly if `from !== batch.currentHolder`.
- A batch is flagged on read if its `lastUpdated` is older than `STALE_MS`.
- On a valid transfer to `intendedDestination`, status becomes `delivered`.
- Anomalies are *still recorded* (so you can see them) but do **not** move custody and do **not** emit a Solana memo.

## Hardware

See [hardware/pi/README.md](./hardware/pi/README.md) for wiring and setup of the
Raspberry Pi 4 agent, and [hardware/alexa/README.md](./hardware/alexa/README.md)
for wiring an Echo Dot via Voice Monkey or IFTTT.

## Demo script (≈2 minutes)

1. **Create** batch `batch-demo-1` in the dashboard: origin `warehouse-1`, destination `local-node-A`.
2. **Warehouse Pi** enter the configured two-button PIN (GPIO17=`1`, GPIO27=`2`) → transfer posts → timeline shows `warehouse-1 → transporter-1`, Solana link when anchored.
3. **Transporter Pi** same with its PIN and roles → `transporter-1 → local-node-A`, batch becomes **delivered**.
4. **Echo Dot** (optional): "Alexa, confirm handoff to transporter" fires a second scenario against a new batch to show voice control.
5. **Failure**: POST a wrong-holder transfer via curl, or wait past `STALE_MS`:
   ```bash
   curl -X POST https://<your>/api/transfer \
     -H "Content-Type: application/json" \
     -H "x-foodtrust-secret: $TRANSFER_SECRET" \
     -d '{"batchId":"batch-demo-1","from":"warehouse-1","to":"transporter-1","deviceId":"curl"}'
   ```
   The batch turns red, the timeline surfaces the anomaly reason, and no Solana tx is emitted for it.

## What we deliberately skipped

- Custom Solana programs (the memo anchor is enough to tell the story in 24h).
- Full Alexa skill certification (Voice Monkey is faster and demo-equivalent).
- Arduino Uno (every confirmation node is a Pi 4 on WiFi).
- Production auth / multi-tenancy.
