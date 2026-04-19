/**
 * ReliefLink driver_tag — USB-connected Arduino Uno
 *
 * Behavior
 * --------
 * Copper pad (the "NFC" tag on the driver's device) is wired to D2.
 * The pad is normally open; touching the **store beacon's** copper pad completes
 * the shared tap circuit to GND and pulls D2 LOW.
 *
 * On every debounced contact closure we print a single line `TAP\n` over USB
 * serial. The USB bridge (`hardware/arduino/usb-bridge/bridge.mjs`) forwards
 * that to the server, which uses the driver's currently-assigned leg to know
 * which node this handoff belongs to — nothing is transmitted about the store.
 *
 * Optional: the host can drive a 2-line Grove RGB LCD by sending
 *   >0,Line one
 *   >1,Line two
 * (Define RELIEFLINK_USE_GROVE_RGB_LCD 0 if no LCD is attached.)
 *
 * Wiring
 * ------
 *   Tap pad  -> D2
 *   D2       -> INPUT_PULLUP (pressed / contact = LOW)
 *   GND      -> shared with the store beacon (common ground on the tap line)
 *   Grove shield + RGB LCD on I2C (optional)
 */

#define RELIEFLINK_USE_GROVE_RGB_LCD 1

#include <Arduino.h>
#if RELIEFLINK_USE_GROVE_RGB_LCD
#include <Wire.h>
#include <rgb_lcd.h>
static rgb_lcd lcd;
#endif

static const uint8_t PIN_TAP = 2;
static const unsigned long DEBOUNCE_MS = 30;
/** Minimum interval between two emitted TAPs, to swallow bounces + quick re-taps. */
static const unsigned long COOLDOWN_MS = 800;

static int lastReading = HIGH;
static int stableState = HIGH;
static unsigned long lastChangeMs = 0;
static unsigned long lastTapMs = 0;

static String hostLineBuffer;

#if RELIEFLINK_USE_GROVE_RGB_LCD
static void lcdLine(uint8_t row, const String &text) {
  if (row > 1) return;
  lcd.setCursor(0, row);
  String padded = text;
  while (padded.length() < 16) padded += ' ';
  if (padded.length() > 16) padded = padded.substring(0, 16);
  lcd.print(padded);
}
#endif

static void handleHostLine(const String &line) {
#if RELIEFLINK_USE_GROVE_RGB_LCD
  if (line.length() < 3 || line.charAt(0) != '>') return;
  const int comma = line.indexOf(',');
  if (comma < 0) return;
  const int row = line.substring(1, comma).toInt();
  if (row != 0 && row != 1) return;
  lcdLine(static_cast<uint8_t>(row), line.substring(comma + 1));
#else
  (void)line;
#endif
}

static void readHostSerial() {
  while (Serial.available()) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r') continue;
    if (c == '\n') {
      if (hostLineBuffer.length() > 0) {
        handleHostLine(hostLineBuffer);
        hostLineBuffer = "";
      }
      continue;
    }
    hostLineBuffer += c;
    if (hostLineBuffer.length() > 64) hostLineBuffer = "";
  }
}

void setup() {
  pinMode(PIN_TAP, INPUT_PULLUP);
  Serial.begin(115200);

#if RELIEFLINK_USE_GROVE_RGB_LCD
  lcd.begin(16, 2);
  lcd.setRGB(20, 80, 200);
  lcdLine(0, "ReliefLink");
  lcdLine(1, "ready to tap");
#endif

  Serial.println(F("[driver_tag] ready"));
}

void loop() {
  readHostSerial();

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
#if RELIEFLINK_USE_GROVE_RGB_LCD
        lcd.setRGB(20, 180, 60);
        lcdLine(0, "TAP sent");
        lcdLine(1, "signing...");
#endif
      }
    }
  }
}
