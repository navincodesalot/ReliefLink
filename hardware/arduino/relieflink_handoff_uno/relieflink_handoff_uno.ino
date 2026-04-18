/**
 * ReliefLink — Arduino Uno R3: two-button PIN + Grove RGB LCD (I2C).
 *
 * The Uno does NOT know the correct PIN. It only sends "1" / "2" over USB
 * serial; the PC bridge compares against TRANSFER_PIN and talks to the API.
 *
 * Button reading is intentionally SIMPLE and matches your proven wiring test:
 * INPUT_PULLUP + active LOW. We fire on press (HIGH→LOW) with a small debounce.
 *
 * Wiring — buttons:
 *   Button 1 → D4 and GND (INPUT_PULLUP, active LOW)
 *   Button 2 → D6 and GND
 *
 * Grove Base Shield + Grove LCD RGB backlight (I2C). Set
 * RELIEFLINK_USE_GROVE_RGB_LCD 0 to test serial-only.
 *
 * USB serial 115200:
 *   - MCU → host: lines "1" or "2" per registered digit
 *   - host → MCU: ">0,text\n" / ">1,text\n" (max 16 chars per line)
 */

#ifndef RELIEFLINK_USE_GROVE_RGB_LCD
#define RELIEFLINK_USE_GROVE_RGB_LCD 1
#endif

#if RELIEFLINK_USE_GROVE_RGB_LCD
#include <Wire.h>
#include <rgb_lcd.h>
rgb_lcd lcd;
#endif

#define PIN_BTN1 4
#define PIN_BTN2 6

const unsigned long DEBOUNCE_MS = 80;

String hostLine;
String pinKeyPreview;

void lcdWriteRow(uint8_t row, const String &msg) {
#if RELIEFLINK_USE_GROVE_RGB_LCD
  lcd.setCursor(0, row);
  for (int i = 0; i < 16; i++) {
    lcd.print(' ');
  }
  lcd.setCursor(0, row);
  for (unsigned i = 0; i < msg.length() && i < 16; i++) {
    lcd.print(msg[i]);
  }
#endif
}

void lcdShowKeyPreview(char digit) {
#if RELIEFLINK_USE_GROVE_RGB_LCD
  pinKeyPreview += digit;
  while (pinKeyPreview.length() > 16) {
    pinKeyPreview.remove(0, 1);
  }
  lcdWriteRow(0, "PIN keys");
  lcdWriteRow(1, pinKeyPreview);
#endif
}

void handleHostLine(const String &line) {
  if (line.length() < 4) {
    return;
  }
  if (line.charAt(0) != '>') {
    return;
  }
  char rowCh = line.charAt(1);
  if (rowCh != '0' && rowCh != '1') {
    return;
  }
  if (line.charAt(2) != ',') {
    return;
  }
  uint8_t row = static_cast<uint8_t>(rowCh - '0');
  String msg = line.substring(3);
  if (msg.length() > 16) {
    msg = msg.substring(0, 16);
  }
  lcdWriteRow(row, msg);
#if RELIEFLINK_USE_GROVE_RGB_LCD
  if (row == 1) {
    pinKeyPreview = msg;
  }
#endif
}

void processHostSerial() {
  while (Serial.available()) {
    char c = static_cast<char>(Serial.read());
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      handleHostLine(hostLine);
      hostLine = "";
      continue;
    }
    if (hostLine.length() < 96) {
      hostLine += c;
    }
  }
}

// Returns: 0 = nothing, 1 = digit 1, 2 = digit 2
// Fires on press-edge (HIGH→LOW). If both are pressed, ignore (avoid double-fire).
uint8_t readButtons() {
  static uint8_t prev1 = HIGH;
  static uint8_t prev2 = HIGH;
  static unsigned long lastMs = 0;

  uint8_t b1 = digitalRead(PIN_BTN1);
  uint8_t b2 = digitalRead(PIN_BTN2);

  // Ignore chords
  if (b1 == LOW && b2 == LOW) {
    prev1 = b1;
    prev2 = b2;
    return 0;
  }

  const unsigned long now = millis();
  if (lastMs != 0 && (now - lastMs) < DEBOUNCE_MS) {
    prev1 = b1;
    prev2 = b2;
    return 0;
  }

  uint8_t out = 0;
  if (prev1 == HIGH && b1 == LOW && b2 == HIGH) {
    out = 1;
  } else if (prev2 == HIGH && b2 == LOW && b1 == HIGH) {
    out = 2;
  }

  if (out != 0) lastMs = now;
  prev1 = b1;
  prev2 = b2;
  return out;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN1, INPUT_PULLUP);
  pinMode(PIN_BTN2, INPUT_PULLUP);

  delay(80);
  Serial.println(F("[relieflink] uno ready"));
  Serial.flush();

#if RELIEFLINK_USE_GROVE_RGB_LCD
  lcd.begin(16, 2);
  lcd.setRGB(32, 128, 64);
  lcdWriteRow(0, "ReliefLink");
  lcdWriteRow(1, "Ready");
#endif
}

void loop() {
  processHostSerial();

  uint8_t btn = readButtons();
  if (btn == 0) {
    return;
  }

  if (btn == 1) {
    Serial.println("1");
    Serial.flush();
    lcdShowKeyPreview('1');
  } else if (btn == 2) {
    Serial.println("2");
    Serial.flush();
    lcdShowKeyPreview('2');
  }
}
