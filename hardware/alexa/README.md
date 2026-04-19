# Alexa and ElevenLabs

This repo now includes a lightweight voice path that fits the current ReliefLink stack:

- Echo Dot or Alexa Custom Skill for input
- `POST /api/voice` as the command webhook
- ReliefLink shipment and tap logic as the action layer
- `GET /api/voice/audio` as the ElevenLabs MP3 proxy for playback

## What works now

`/api/voice` accepts either:

- structured JSON commands
- a minimal Alexa `LaunchRequest` or `IntentRequest` body

Supported intents or commands:

- `CreateShipmentIntent` / `create_shipment`
- `ShipmentStatusIntent` / `shipment_status`
- `DriverStatusIntent` / `driver_status`
- `ConfirmArrivalIntent` / `simulate_tap`
- `LatestUpdateIntent` / `latest_update`

## Fastest hackathon architecture

1. Create an Alexa Custom Skill with invocation name `food beacon`.
2. Point the skill endpoint to `POST https://<your-domain>/api/voice?token=<VOICE_WEBHOOK_TOKEN>`.
3. Define intents that map to the supported names above.
4. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`.
5. When Alexa hits `/api/voice`, the route returns:
   - speech text
   - an Alexa response envelope
   - an `audioUrl` when ElevenLabs is configured
6. Use that `audioUrl` inside your skill response path if you want the Echo Dot to play the ElevenLabs-generated line.

## Sample command payload

```json
{
  "command": "latest_update",
  "preferAudio": true
}
```

## Sample Alexa slot mapping

- `CreateShipmentIntent`
  - `origin`
  - `destination`
  - `waypoints`
  - `description`
  - `cargo`
  - `quantity`
  - `deviceId`
- `ShipmentStatusIntent`
  - `shipmentId`
- `DriverStatusIntent`
  - `deviceId`
- `ConfirmArrivalIntent`
  - `shipmentId`
  - `legIndex`

## Important note for Echo Dot playback

Alexa SSML audio hosting is strict about HTTPS and MP3 formatting. This implementation gives you a working HTTPS audio endpoint, but depending on your exact Alexa path you may still want to pre-generate or transcode clips for maximum demo stability.
