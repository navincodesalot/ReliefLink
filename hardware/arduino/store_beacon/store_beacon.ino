/**
 * ReliefLink store_beacon — battery-powered Arduino at a delivery node
 *
 * Contact on D2 starts a 3s countdown, then the buzzer sounds. Optional Grove
 * RGB LCD (I2C) shows stage: idle / confirming / complete. No serial, no
 * store ID on the wire.
 *
 * Wiring:
 *   Tap D2, GND shared with driver · Buzzer D9 (+ resistor) · LED D13 optional
 *   Grove RGB LCD: I2C (A4/A5) + 5V/GND — set RELIEFLINK_USE_GROVE_RGB_LCD 0
 *   if not installed.
 */

#define RELIEFLINK_USE_GROVE_RGB_LCD 1

#include <Arduino.h>
#if RELIEFLINK_USE_GROVE_RGB_LCD
#include <Wire.h>
#include <rgb_lcd.h>
static rgb_lcd lcd;
#endif

static const uint8_t PIN_TAP = 2;
static const uint8_t PIN_BUZZ = 9;
static const uint8_t PIN_LED = 13;

static const unsigned long DEBOUNCE_MS = 30;
static const unsigned long COOLDOWN_MS = 1200;
static const unsigned long DELAY_MS = 3000;
static const unsigned int BUZZ_FREQ = 2200;
static const unsigned long BUZZ_MS = 700;

enum State { IDLE, WAITING, BUZZING };

static State state = IDLE;
static unsigned long stateStartedMs = 0;
static unsigned long lastTapMs = 0;

static int lastReading = HIGH;
static int stableState = HIGH;
static unsigned long lastChangeMs = 0;

#if RELIEFLINK_USE_GROVE_RGB_LCD
/** Last state we painted (255 = force redraw). */
static uint8_t lastPaintedState = 255;
static unsigned long lastPaintedRemSec = 999;

static void lcdLine(uint8_t row, const char *text) {
  if (row > 1) return;
  lcd.setCursor(0, row);
  char buf[17];
  uint8_t i = 0;
  for (; i < 16 && text[i]; i++) buf[i] = text[i];
  for (; i < 16; i++) buf[i] = ' ';
  buf[16] = '\0';
  lcd.print(buf);
}

static void maybeUpdateLcd(unsigned long now) {
  unsigned long remSec = 0;
  if (state == WAITING) {
    const unsigned long elapsed = now - stateStartedMs;
    const unsigned long rem = elapsed < DELAY_MS ? (DELAY_MS - elapsed) : 0;
    remSec = (rem + 999UL) / 1000UL;
    if (remSec > 3UL) remSec = 3UL;
    if (remSec < 1UL && rem > 0) remSec = 1UL;
  }

  const uint8_t st = static_cast<uint8_t>(state);
  bool need = (st != lastPaintedState);
  if (state == WAITING && remSec != lastPaintedRemSec) need = true;
  if (!need) return;

  lastPaintedState = st;
  if (state == WAITING) lastPaintedRemSec = remSec;
  else lastPaintedRemSec = 999;

  switch (state) {
    case IDLE:
      lcd.setRGB(30, 100, 200);
      lcdLine(0, "ReliefLink");
      lcdLine(1, "Ready - tap");
      break;

    case WAITING:
      lcd.setRGB(200, 140, 40);
      lcdLine(0, "Tap received");
      {
        char line1[17];
        if (remSec <= 1)
          snprintf(line1, sizeof(line1), "Verify: 1s");
        else
          snprintf(line1, sizeof(line1), "Verify: %lus", remSec);
        lcdLine(1, line1);
      }
      break;

    case BUZZING:
      lcd.setRGB(40, 200, 90);
      lcdLine(0, "Handoff OK");
      lcdLine(1, "Thank you");
      break;
  }
}
#endif

void setup() {
  pinMode(PIN_TAP, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZ, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZ, LOW);

#if RELIEFLINK_USE_GROVE_RGB_LCD
  Wire.begin();
  lcd.begin(16, 2);
  lastPaintedState = 255;
  maybeUpdateLcd(millis());
#endif
}

static void onContact() {
  const unsigned long now = millis();
  if ((now - lastTapMs) < COOLDOWN_MS) return;
  if (state != IDLE) return;
  lastTapMs = now;
  stateStartedMs = now;
  state = WAITING;
#if RELIEFLINK_USE_GROVE_RGB_LCD
  lastPaintedRemSec = 999;
#endif
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
#if RELIEFLINK_USE_GROVE_RGB_LCD
        lastPaintedState = 255;
#endif
      }
      break;
    }
  }

#if RELIEFLINK_USE_GROVE_RGB_LCD
  maybeUpdateLcd(now);
#endif
}
