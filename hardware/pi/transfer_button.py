#!/usr/bin/env python3
"""
FoodTrust — Raspberry Pi 4: two-button PIN, then transfer.

GPIO 17 = key "1", GPIO 27 = key "2". User enters a PIN made only of 1 and 2
(e.g. 111222 or 121212) with length matching TRANSFER_PIN in the environment.
After the last digit, if the sequence matches, the script POSTs /api/transfer
with the same PIN in the JSON body (verified on the server when TRANSFER_PIN
is set there too).

Wiring (BCM):
  * Button 1: GPIO17 — one leg to pin, other to GND (internal pull-up).
  * Button 2: GPIO27 — same.
  * Do not wire 5V directly to GPIO inputs.

Environment (see foodtrust.env.example):
  API_BASE_URL, TRANSFER_SECRET, DEVICE_ID, ROLE_FROM, ROLE_TO, BATCH_ID,
  TRANSFER_PIN (e.g. 121212 — only characters 1 and 2),
  PIN_IDLE_SEC (optional, default 15 — reset partial entry after idle),
  BUTTON_1_GPIO (default 17), BUTTON_2_GPIO (default 27).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
from urllib import error, request

try:
    from gpiozero import Button  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover
    Button = None  # type: ignore[assignment]


def env(name: str, default: str | None = None) -> str:
    val = os.environ.get(name, default)
    if val is None or val == "":
        print(f"[foodtrust] missing env var: {name}", file=sys.stderr)
        sys.exit(2)
    return val


def beep(success: bool) -> None:
    message = "PIN accepted, transfer logged" if success else "Wrong PIN or transfer failed"
    for cmd in (
        ["espeak", "-s", "160", message],
        ["say", message],
        (
            ["aplay", "/usr/share/sounds/alsa/Front_Center.wav"]
            if success
            else ["aplay", "/usr/share/sounds/alsa/Side_Left.wav"]
        ),
    ):
        try:
            subprocess.run(
                cmd,
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3,
            )
            return
        except FileNotFoundError:
            continue
        except Exception:
            continue


def post_transfer(pin: str) -> bool:
    api_base = env("API_BASE_URL").rstrip("/")
    secret = env("TRANSFER_SECRET").encode()
    payload = {
        "batchId": env("BATCH_ID"),
        "from": env("ROLE_FROM"),
        "to": env("ROLE_TO"),
        "deviceId": env("DEVICE_ID"),
        "pin": pin,
    }
    body = json.dumps(payload, separators=(",", ":")).encode()
    signature = hmac.new(secret, body, hashlib.sha256).hexdigest()

    req = request.Request(
        f"{api_base}/api/transfer",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-foodtrust-signature": signature,
        },
    )
    try:
        with request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            status = resp.status
    except error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace") if err.fp else str(err)
        status = err.code
    except Exception as err:
        print(f"[foodtrust] network error: {err}", file=sys.stderr)
        return False

    try:
        parsed = json.loads(raw)
    except ValueError:
        parsed = {"raw": raw}

    if status >= 200 and status < 300:
        event = parsed.get("event", {}) if isinstance(parsed, dict) else {}
        is_anomaly = bool(event.get("isAnomaly"))
        sig = event.get("solanaSignature")
        print(f"[foodtrust] ok status={status} anomaly={is_anomaly} solana={sig or '-'}")
        return not is_anomaly

    print(f"[foodtrust] failed status={status} body={raw[:200]}", file=sys.stderr)
    return False


def validate_expected_pin(expected: str) -> None:
    if not expected:
        print("[foodtrust] TRANSFER_PIN must be non-empty", file=sys.stderr)
        sys.exit(2)
    if not all(c in "12" for c in expected):
        print("[foodtrust] TRANSFER_PIN must contain only 1 and 2", file=sys.stderr)
        sys.exit(2)
    if len(expected) > 32:
        print("[foodtrust] TRANSFER_PIN too long (max 32)", file=sys.stderr)
        sys.exit(2)


def main() -> int:
    expected = env("TRANSFER_PIN")
    validate_expected_pin(expected)
    pin_len = len(expected)
    idle_sec = float(os.environ.get("PIN_IDLE_SEC", "15"))
    gpio_1 = int(os.environ.get("BUTTON_1_GPIO", "17"))
    gpio_2 = int(os.environ.get("BUTTON_2_GPIO", "27"))

    state: dict[str, object] = {
        "buf": [],
        "last": None,
    }

    def reset_if_idle() -> None:
        now = time.time()
        last = state["last"]
        buf = state["buf"]
        if last is not None and buf and now - float(last) > idle_sec:
            print("[foodtrust] PIN entry timed out, clearing")
            state["buf"] = []
            state["last"] = None

    def on_digit(d: str) -> None:
        reset_if_idle()
        now = time.time()
        state["last"] = now
        buf: list[str] = state["buf"]  # type: ignore[assignment]
        buf.append(d)
        entered = "".join(buf)
        print(f"[foodtrust] entered {entered!r} ({len(buf)}/{pin_len})")
        if len(buf) < pin_len:
            return
        sequence = "".join(buf[:pin_len])
        state["buf"] = []
        state["last"] = None
        if sequence == expected:
            print("[foodtrust] PIN OK, posting transfer…")
            ok = post_transfer(sequence)
            beep(ok)
        else:
            print("[foodtrust] wrong PIN", file=sys.stderr)
            beep(False)

    if Button is None:
        print("[foodtrust] gpiozero not installed — simulating full PIN", expected)
        for c in expected:
            on_digit(c)
        return 0

    b1 = Button(gpio_1, pull_up=True, bounce_time=0.25)
    b2 = Button(gpio_2, pull_up=True, bounce_time=0.25)
    b1.when_pressed = lambda: on_digit("1")
    b2.when_pressed = lambda: on_digit("2")

    print(
        f"[foodtrust] PIN length {pin_len}. "
        f"GPIO{gpio_1}=1 GPIO{gpio_2}=2. Idle reset {idle_sec}s. Ctrl+C to exit."
    )
    try:
        while True:
            time.sleep(0.5)
            reset_if_idle()
    except KeyboardInterrupt:
        print("\n[foodtrust] bye")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
