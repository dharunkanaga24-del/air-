/*
 * ======================================================================================
 * AeroPulse IoT - ESP32 Air Quality Sensor to Firebase Realtime Database
 * ======================================================================================
 * 
 * Hardware Requirements:
 * - ESP32 Development Board (e.g. ESP32 NodeMCU / ESP32 WROOM-32)
 * - Analog Air Quality / Gas Sensor (e.g., MQ-135, MQ-2, MQ-7, or similar)
 * - Jumper wires & Breadboard
 * 
 * Pin Connections:
 * - Sensor VCC  -> ESP32 5V (or 3.3V depending on module)
 * - Sensor GND  -> ESP32 GND
 * - Sensor AOUT -> ESP32 GPIO 34 (Analog Input Pin - ADC1)
 * 
 * Required Libraries (Install via Arduino Library Manager):
 * 1. "Firebase ESP Client" by Mobizt (v4.4.14 or later)
 * 2. "WiFi" (Built-in for ESP32)
 * ======================================================================================
 */

#include <Arduino.h>
#include <WiFi.h>                  // Use <ESP8266WiFi.h> if using an ESP8266
#include <Firebase_ESP_Client.h>   // Install via Library Manager

// Provide the token generation process info
#include <addons/TokenHelper.h>
// Provide the RTDB payload printing info and other helper functions
#include <addons/RTDBHelper.h>

// 1. Put your Wi-Fi credentials here
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// 2. Put your Firebase credentials here
// API Key is found in Firebase Console -> Project Settings -> General -> Web API Key
#define API_KEY "YOUR_FIREBASE_API_KEY"
// Database URL format: https://<PROJECT_ID>-default-rtdb.firebaseio.com (without trailing slash)
#define DATABASE_URL "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com" 

// Define Firebase Data objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Analog pin where your sensor is connected (GPIO 34 is an input-only ADC1 pin)
const int sensorPin = 34;

// Timing variables
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 2000; // Send reading every 2000ms (2 seconds)

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("==================================================");
  Serial.println("     AeroPulse IoT - ESP32 Air Quality Node       ");
  Serial.println("==================================================");
  
  // Set ADC attenuation to 11dB (0 - 3.3V range for full 12-bit ADC 0 - 4095)
  // Compatible with all ESP32 Arduino Core versions (v2.x & v3.x)
  #if defined(ADC_11db)
    analogSetAttenuation(ADC_11db);
  #elif defined(ADC_ATTEN_DB_11)
    analogSetAttenuation(ADC_ATTEN_DB_11);
  #elif defined(ADC_ATTEN_DB_12)
    analogSetAttenuation(ADC_ATTEN_DB_12);
  #endif
  
  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 40) {
    delay(300);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WiFi] Failed to connect! Please check your SSID and password.");
  }

  // Initialize Firebase
  Serial.println("[Firebase] Initializing configuration...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.test_mode = true; // Bypasses auth when database is in test mode (.read/.write = true)
  
  // Assign callback function for long running token generation task
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Set database read timeout
  fbdo.setResponseSize(1024);
  
  Serial.println("[System] Ready. Beginning sensor telemetry stream...");
}

void loop() {
  // Check if 2 seconds have passed since last reading
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    
    // Ensure WiFi is connected
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
      return;
    }
    
    // Take multiple samples and average them to eliminate electronic noise
    int rawSum = 0;
    const int sampleCount = 10;
    for (int i = 0; i < sampleCount; i++) {
      rawSum += analogRead(sensorPin);
      delay(5);
    }
    int airQualityReading = rawSum / sampleCount;
    
    Serial.print("[Sensor] Raw ADC Value (0-4095): ");
    Serial.print(airQualityReading);
    
    // Estimate air status for Serial Monitor
    if (airQualityReading < 800) {
      Serial.print(" -> Quality: EXCELLENT");
    } else if (airQualityReading < 1600) {
      Serial.print(" -> Quality: GOOD");
    } else if (airQualityReading < 2400) {
      Serial.print(" -> Quality: MODERATE");
    } else if (airQualityReading < 3200) {
      Serial.print(" -> Quality: UNHEALTHY");
    } else {
      Serial.print(" -> Quality: HAZARDOUS");
    }
    
    // Send data to Firebase under the path "sensor/air_quality"
    if (Firebase.ready()) {
      if (Firebase.RTDB.setInt(&fbdo, "sensor/air_quality", airQualityReading)) {
        Serial.println(" -> [Firebase] Sync SUCCESS!");
      } else {
        Serial.print(" -> [Firebase] Sync ERROR: ");
        Serial.println(fbdo.errorReason());
      }
    } else {
      Serial.println(" -> [Firebase] Client not ready");
    }
  }
}
