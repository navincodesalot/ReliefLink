/**
 * ReliefLink driver_tag — USB-connected Arduino Uno
 *
 * Copper pad on D2; contact with the store beacon pulls LOW (INPUT_PULLUP).
 * On debounced closure, prints `TAP\n` over USB. The bridge forwards to the
 * server; the server resolves the leg from this driver's deviceId only.
 *
 * Wiring: Tap pad -> D2, GND shared with store beacon on the tap line.
 */

#include <Arduino.h>

static const uint8_t PIN_TAP = 2;
static const unsigned long DEBOUNCE_MS = 30;
static const unsigned long COOLDOWN_MS = 800;

static int lastReading = HIGH;
static int stableState = HIGH;
static unsigned long lastChangeMs = 0;
static unsigned long lastTapMs = 0;

void setup() {
  pinMode(PIN_TAP, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.println(F("[driver_tag] ready"));
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
    if (stableState == LOW) {
      if ((now - lastTapMs) > COOLDOWN_MS) {
        lastTapMs = now;
        Serial.println(F("TAP"));
      }
    }
  }
}
