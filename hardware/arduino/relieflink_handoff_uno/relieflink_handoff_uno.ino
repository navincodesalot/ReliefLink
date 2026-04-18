/**
 * ReliefLink — Arduino Uno R3: two-button PIN + Grove RGB LCD (I2C).
 *
 * Wiring — buttons (to the shield or breadboard, not a conflicting Grove port):
 *   Button 1 → D2 and GND (INPUT_PULLUP, LOW = pressed)
 *   Button 2 → D3 and GND
 *
 * Grove Base Shield + Grove LCD RGB backlight: plug the LCD into an **I2C**
 * Grove connector on the shield (Wire uses Uno **A4/A5** under the shield).
 * Library: "Grove - LCD RGB backlight" (`rgb_lcd.h`).
 *
 * USB serial 115200:
 *   - MCU → host: lines "1" or "2" per button press
 *   - host → MCU: display lines ">0,text\n" and ">1,text\n" (text max 16 chars)
 */

// 1 = Grove RGB LCD (default). Set to 0 only if you have no LCD / no rgb_lcd library.
#ifndef RELIEFLINK_USE_GROVE_RGB_LCD
#define RELIEFLINK_USE_GROVE_RGB_LCD 1
#endif

#if RELIEFLINK_USE_GROVE_RGB_LCD
#include <Wire.h>
#include <rgb_lcd.h>
rgb_lcd lcd;
#endif

const int BUTTON_1_PIN = 2;
const int BUTTON_2_PIN = 3;
const unsigned long DEBOUNCE_MS = 280;

unsigned long lastPressMs = 0;
String hostLine;

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

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_1_PIN, INPUT_PULLUP);
  pinMode(BUTTON_2_PIN, INPUT_PULLUP);

#if RELIEFLINK_USE_GROVE_RGB_LCD
  lcd.begin(16, 2);
  lcd.setRGB(32, 128, 64);
  lcdWriteRow(0, "ReliefLink");
  lcdWriteRow(1, "Ready");
#endif
}

void loop() {
  processHostSerial();

  unsigned long now = millis();
  if (now - lastPressMs < DEBOUNCE_MS) {
    return;
  }

  if (digitalRead(BUTTON_1_PIN) == LOW) {
    lastPressMs = now;
    Serial.println("1");
    while (digitalRead(BUTTON_1_PIN) == LOW) {
      delay(5);
    }
    return;
  }

  if (digitalRead(BUTTON_2_PIN) == LOW) {
    lastPressMs = now;
    Serial.println("2");
    while (digitalRead(BUTTON_2_PIN) == LOW) {
      delay(5);
    }
  }
}
