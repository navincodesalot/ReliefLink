# FoodTrust Pi agent

One Raspberry Pi 4 per supply-chain node (warehouse, transporter, local). The
operator enters a **two-button PIN** (keys `1` and `2` only). When the sequence
matches `TRANSFER_PIN`, the agent POSTs the transfer (with the same PIN in the
JSON body) and plays audio feedback.

## Wiring

| Component | GPIO (BCM) | Notes |
| --------- | ---------- | ----- |
| Button “1” | 17 | One leg to GPIO17, other to GND. Internal pull-up. |
| Button “2” | 27 | One leg to GPIO27, other to GND. Internal pull-up. |
| Speaker | 3.5mm jack | Or USB audio; used for `espeak` / WAV cues. |

Use **GND + GPIO** only on the signal pins — **do not** connect **5V** to GPIO.

## PIN entry

- `TRANSFER_PIN` is a string of `1` and `2` only (e.g. `111222`, `121212`). Its
  **length** is how many presses are required before a submit.
- GPIO **17** appends `1`, GPIO **27** appends `2`.
- If no press for `PIN_IDLE_SEC` seconds (default 15), a partial entry is cleared.
- Set the **same** `TRANSFER_PIN` in Vercel (`TRANSFER_PIN`) if you want the
  server to reject wrong PINs; if unset on the server, the Pi still enforces it
  locally before POSTing.

## Install

```bash
sudo apt update
sudo apt install -y python3 python3-gpiozero python3-rpi.gpio espeak
scp hardware/pi/transfer_button.py pi@<pi-ip>:~/foodtrust/
scp hardware/pi/foodtrust.env.example pi@<pi-ip>:/tmp/foodtrust.env
ssh pi@<pi-ip> sudo mv /tmp/foodtrust.env /etc/foodtrust.env
```

Edit `/etc/foodtrust.env`: `TRANSFER_PIN`, `DEVICE_ID`, `ROLE_FROM`, `ROLE_TO`,
`BATCH_ID`, `API_BASE_URL`, `TRANSFER_SECRET`.

## Run

```bash
set -a; source /etc/foodtrust.env; set +a
python3 ~/foodtrust/transfer_button.py
```

To auto-start at boot, use a systemd unit with `EnvironmentFile=/etc/foodtrust.env`
and `ExecStart=/usr/bin/python3 /home/pi/foodtrust/transfer_button.py`.

## Auth

Each POST body is signed with HMAC-SHA256 (`TRANSFER_SECRET`) in header
`x-foodtrust-signature`. The plaintext JSON includes a `pin` field after a successful local PIN entry.

## Audio

Success: “PIN accepted, transfer logged”. Wrong PIN or HTTP error: failure cue.
