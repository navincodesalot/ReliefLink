const int buttonPin = 2;
const int buzzerPin = 11;

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  int buttonState = digitalRead(buttonPin);

  if (buttonState == LOW) { // button pressed (grounded)
    Serial.println("Button pressed!");
    digitalWrite(buzzerPin, HIGH); // turn buzzer on
  } else {
    digitalWrite(buzzerPin, LOW);  // turn buzzer off
  }
}