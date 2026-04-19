/**
 * ReliefLink store_beacon — USB to laptop (serial to bridge / app)
 *
 * Tap sense: D11 INPUT_PULLUP, contact to GND = completed circuit (reads LOW).
 * On each debounced tap: buzzer on D9, then a one-line serial event so the host
 * can complete registration / handoff (bridge/API TBD).
 *
 * A stable store **deviceId** is kept in EEPROM across power cycles. The first
 * time this board ever gets an ID, boot announces `first=1` so the host can
 * place it on the map once.
 *
 * Wiring:
 *   D11 — tap pad (other side to GND when touched)
 *   D9  — passive buzzer + (~100 ohm), − to GND
 *   D13 — optional status LED (blinks on tap)
 */

#include <Arduino.h>
#include <EEPROM.h>

static const uint8_t PIN_TAP = 2;
static const uint8_t PIN_BUZZ = 11;
static const uint8_t PIN_LED = 13;

static const unsigned long DEBOUNCE_MS = 35;
static const unsigned long COOLDOWN_MS = 900;
static const unsigned int BUZZ_FREQ_HZ = 2200;
static const unsigned long BUZZ_MS = 350;

/** EEPROM layout */
static const int EE_MAGIC_ADDR = 0;
static const uint8_t EE_MAGIC = 0x52; // 'R' — valid programmed block
static const int EE_ID_ADDR = 1;
static const uint8_t STORE_ID_LEN = 12;
static const int EE_FIRST_SYNC_ADDR = 14;
static const uint8_t EE_FIRST_SYNC_YES = 0x01;

static char storeId[STORE_ID_LEN + 1];

static int lastReading = HIGH;
static int stableState = HIGH;
static unsigned long lastChangeMs = 0;
static unsigned long lastTapMs = 0;

static void generateAndStoreId() {
  randomSeed(analogRead(A0) ^ (int)micros() ^ (int)millis());
  for (uint8_t i = 0; i < STORE_ID_LEN; i++) {
    const char c = "0123456789abcdef"[random(16)];
    EEPROM.update(EE_ID_ADDR + i, (uint8_t)c);
    storeId[i] = c;
    delay(5);
  }
  storeId[STORE_ID_LEN] = '\0';
  EEPROM.update(EE_MAGIC_ADDR, EE_MAGIC);
}

static void loadStoreIdFromEeprom() {
  for (uint8_t i = 0; i < STORE_ID_LEN; i++)
    storeId[i] = (char)EEPROM.read(EE_ID_ADDR + i);
  storeId[STORE_ID_LEN] = '\0';
}

/** Returns true if this boot created a new ID (first-ever provision). */
static bool ensureStoreId() {
  if (EEPROM.read(EE_MAGIC_ADDR) != EE_MAGIC) {
    generateAndStoreId();
    EEPROM.update(EE_FIRST_SYNC_ADDR, 0xFF);
    return true;
  }
  loadStoreIdFromEeprom();
  return false;
}

/** First time we have an ID but host has not yet acknowledged map placement. */
static bool shouldAnnounceFirstOnline() {
  return EEPROM.read(EE_FIRST_SYNC_ADDR) != EE_FIRST_SYNC_YES;
}

static void markFirstOnlineAcknowledged() {
  EEPROM.update(EE_FIRST_SYNC_ADDR, EE_FIRST_SYNC_YES);
}

void setup() {
  pinMode(PIN_TAP, INPUT_PULLUP);
  pinMode(PIN_BUZZ, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_BUZZ, LOW);
  digitalWrite(PIN_LED, LOW);

  Serial.begin(115200);

  const bool firstProvision = ensureStoreId();

  Serial.print(F("RELIEFLINK_STORE_READY id="));
  Serial.print(storeId);
  Serial.print(F(" firstProvision="));
  Serial.print(firstProvision ? 1 : 0);
  Serial.print(F(" firstOnline="));
  Serial.println(shouldAnnounceFirstOnline() ? 1 : 0);

  if (shouldAnnounceFirstOnline()) {
    Serial.print(F("RELIEFLINK_STORE_FIRST_ONLINE id="));
    Serial.println(storeId);
    markFirstOnlineAcknowledged();
  }
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

        digitalWrite(PIN_LED, HIGH);
        tone(PIN_BUZZ, BUZZ_FREQ_HZ, BUZZ_MS);
        delay(BUZZ_MS + 40UL);
        noTone(PIN_BUZZ);
        digitalWrite(PIN_LED, LOW);

        Serial.print(F("RELIEFLINK_TAP id="));
        Serial.print(storeId);
        Serial.print(F(" t="));
        Serial.println(now);
        Serial.flush();
      }
    }
  }
}
