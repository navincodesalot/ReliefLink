# Amazon Echo Dot → ReliefLink

Say something like *"Alexa, confirm handoff to transporter"* and have the ReliefLink dashboard update like a hardware node.

Use an Alexa Routine to trigger a webhook to `/api/voice`, which uses the same database and Solana anchor logic as `/api/transfer`.

## Option A — Voice Monkey (fastest)

1. Create an account at <https://voicemonkey.io/>, link Amazon, install Voice Monkey on your Echo.
2. Create a Monkey, e.g. `relieflink-warehouse-confirm`.
3. **Webhook:** Method `POST`, URL  
   `https://<your-app>.vercel.app/api/voice?token=<TRANSFER_SECRET>`  
   Body (add `"pin"` if `TRANSFER_PIN` is set on the server):
   ```json
   {
     "batchId": "batch-demo-1",
     "from": "warehouse-1",
     "to": "transporter-1",
     "deviceId": "alexa-warehouse",
     "pin": "121212"
   }
   ```
4. Alexa Routine: custom phrase → trigger that Monkey.

## Option B — IFTTT / Make / Pipedream

Same JSON to `/api/voice?token=<secret>` from any HTTPS webhook.

## Auth

URL `token` or header `x-relieflink-secret: <TRANSFER_SECRET>`. Treat it like a password.

## Hardware vs Echo

**Arduino + USB bridge** gives local confirmation at the handoff. **Echo** is best for a dispatch desk voice trigger; both hit the same API.
