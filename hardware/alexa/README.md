# Amazon Echo Dot → FoodTrust

Goal: say something like *"Alexa, confirm handoff to transporter"* and have the
FoodTrust dashboard update as if a Pi button had been pressed.

The fastest hackathon path does **not** require a custom Alexa skill. We use an
Alexa Routine to call a webhook at `/api/voice`, which shares the same database
and Solana anchor logic as the Pi endpoint.

## Option A — Voice Monkey (recommended for 24h)

1. Create a free account at <https://voicemonkey.io/>, link your Amazon account
   and install the Voice Monkey skill on your Echo Dot.
2. Create a "Monkey" named e.g. `foodtrust-warehouse-confirm`.
3. In the Monkey's *Webhook Action*, set:
   - Method: `POST`
   - URL: `https://<your-vercel-app>.vercel.app/api/voice?token=<TRANSFER_SECRET>`
   - Content type: `application/json`
   - Body (add `"pin"` if `TRANSFER_PIN` is set on the server — same string as on the Pi, e.g. six presses as `1`/`2`):
     ```json
     {
       "batchId": "batch-demo-1",
       "from": "warehouse-1",
       "to": "transporter-1",
       "deviceId": "alexa-warehouse",
       "pin": "121212"
     }
     ```
4. In the Alexa app, create a Routine: *When I say "Alexa, confirm handoff to
   transporter"* → action *Voice Monkey — Trigger Monkey
   foodtrust-warehouse-confirm*.
5. Repeat with two more Monkeys for `transporter → local-node-A` and for
   delivery confirmation.

## Option B — IFTTT webhook

The same body posted to `/api/voice?token=<secret>` works from any webhook
tool — IFTTT, Pipedream, n8n, Make, Zapier. Any Alexa phrase that triggers the
webhook in turn triggers a real FoodTrust transfer.

## Auth

The voice webhook requires either `?token=<TRANSFER_SECRET>` on the URL or an
`x-foodtrust-secret: <value>` header. Treat the token like a password — anyone
who has it can record transfers.

## Speaker output on the Pi vs the Echo

Both surfaces speak. The Pi agent uses `espeak`/`aplay` on the 3.5mm jack to
provide local confirmation at the handoff point, which is what disaster-relief
workers actually need (they are not near the Echo). The Echo Dot is best used
at the dispatch console for voice-triggered confirmations, not as the audio
output for field handoffs.
