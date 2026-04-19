/**
 * ReliefLink store_beacon — battery-powered Arduino Uno at a delivery node
 *
 * Purpose
 * -------
 * Local confirmation only. This board has no network, no USB, and never tells
 * anyone who it is. When the copper pad on this board briefly connects to the
 * driver's copper pad (shared tap line to common GND), we count a contact,
 * wait 3 seconds, then pulse the buzzer so the person at the beacon knows the
 * handoff was received.
 *
 * The cryptographic proof of who just handed off what is produced on the
 * server side from the driver's assigned leg — not from anything this board
 * says. This sketch is purely a physical "acknowledge" buzz.
 *
 * Wiring
 * ------
 *   Tap pad    -> D2 (INPUT_PULLUP; contact = LOW)
 *   GND        -> shared with driver Arduino (common ground on the tap line)
 *   Buzzer +   -> D9 (use a ~100ohm series resistor for a passive piezo)
 *   Buzzer -   -> GND
 *   Power      -> 9V battery to Vin, or 5V via USB charger to 5V pin
 *
 * Optional: a battery-operated LED on D13 flashes during the 3s countdown.
 */

#include <Arduino.h>

static const uint8_t PIN_TAP = 2;
static const uint8_t PIN_BUZZ = 9;
static const uint8_t PIN_LED = 13;

static const unsigned long DEBOUNCE_MS = 30;
static const unsigned long COOLDOWN_MS = 1200;
static const unsigned long DELAY_MS = 3000;
/** Tone frequency + duration when the buzzer finally fires. */
static const unsigned int BUZZ_FREQ = 2200;
static const unsigned long BUZZ_MS = 700;

enum State { IDLE, WAITING, BUZZING };

static State state = IDLE;
static unsigned long stateStartedMs = 0;
static unsigned long lastTapMs = 0;

static int lastReading = HIGH;
static int stableState = HIGH;
static unsigned long lastChangeMs = 0;

void setup() {
  pinMode(PIN_TAP, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZ, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZ, LOW);
}

static void onContact() {
  const unsigned long now = millis();
  if ((now - lastTapMs) < COOLDOWN_MS) return;
  if (state != IDLE) return;
  lastTapMs = now;
  stateStartedMs = now;
  state = WAITING;
}

void loop() {
  const int reading = digitalRead(PIN_TAP);
  const unsigned long now = millis();

  if (reading != lastReading) {
    lastChangeMs = now;
    lastReading = reading;
  }

  if ((now - lastChangeMs) > DEBOUNCE_MS && reading != stableState) {
    stableState = reading;
    if (stableState == LOW) onContact();
  }

  switch (state) {
    case IDLE:
      digitalWrite(PIN_LED, LOW);
      break;

    case WAITING: {
      const unsigned long elapsed = now - stateStartedMs;
      digitalWrite(PIN_LED, ((elapsed / 250UL) & 1UL) ? HIGH : LOW);
      if (elapsed >= DELAY_MS) {
        state = BUZZING;
        stateStartedMs = now;
        digitalWrite(PIN_LED, HIGH);
        tone(PIN_BUZZ, BUZZ_FREQ, BUZZ_MS);
      }
      break;
    }

    case BUZZING: {
      const unsigned long elapsed = now - stateStartedMs;
      if (elapsed >= BUZZ_MS + 200UL) {
        noTone(PIN_BUZZ);
        digitalWrite(PIN_LED, LOW);
        state = IDLE;
      }
      break;
    }
  }
}
