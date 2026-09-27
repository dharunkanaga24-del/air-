# 🌿 AeroPulse IoT — Real-Time ESP32 Air Quality Dashboard

A high-performance, real-time IoT Air Quality Monitoring Web Application built to pair directly with ESP32 microcontrollers and Firebase Realtime Database.

---

## 🚀 Quick Start (Running the Website)

### Option 1: Direct Browser Launch
Simply double click or open `index.html` in Google Chrome, Microsoft Edge, Firefox, or Safari!

### Option 2: Run Local Dev Server
```bash
npx serve . -l 3000
```
Then visit **`http://localhost:3000`** in your browser.

---

## ⚡ How It Works with Your ESP32 Code

Your ESP32 reads analog values from pin 34 (GPIO 34, 12-bit ADC ranging from `0` to `4095`) and sends the data to Firebase Realtime Database at the path `sensor/air_quality` every 2 seconds.

```
[MQ Air Sensor] ──> [ESP32 Pin 34] ──(WiFi)──> [Firebase Realtime DB] ──(WebSockets/SSE)──> [AeroPulse Web Dashboard]
```

### ESP32 Pin Wiring:
| Sensor Pin | ESP32 Board Connection | Description |
| :--- | :--- | :--- |
| **VCC** | **5V (VIN)** or 3.3V | Power supply |
| **GND** | **GND** | Ground reference |
| **AOUT** | **GPIO 34** | ADC1 Analog Input (0 - 4095) |

---

## 🔑 Firebase Realtime Database Setup Guide

1. Go to [Firebase Console](https://console.firebase.google.com/) and create or open your project.
2. Under **Build**, select **Realtime Database** and click **Create Database**.
3. Select your database location (e.g. `us-central1` or closest to you).
4. In the **Rules** tab, allow public read/write during testing:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Copy your **Database URL** (e.g. `https://your-project-default-rtdb.firebaseio.com/`).
6. In the **AeroPulse Dashboard**, click **⚙️ Firebase Config**, paste your Database URL, and click **Connect & Save**!

---

## ✨ Features

- 🟢 **Live Bi-Directional Telemetry**: Synchronized with your ESP32's 2-second publishing rate via Firebase WebSockets & Server-Sent Events (SSE).
- 📊 **Interactive Time-Series Chart**: Real-time Chart.js graph with customizable point history (30, 60, 120 points), pause/resume, and color transitions.
- 🎯 **Air Quality Index (AQI) Calculation**: Automatic conversion of raw 12-bit ADC (0-4095) to EPA standard AQI levels (Good, Moderate, Unhealthy, Hazardous).
- 🧪 **Gas Concentration Estimations**: Calculated PPM concentrations for CO₂, Smoke/CO, VOCs, and Ammonia.
- 💡 **Dynamic Health Advisory**: Contextual tips for window ventilation, air purifiers, outdoor exercise, and sensitive groups.
- 🔔 **Threshold Alarms & Audio Synthesizer**: Web Audio API sound generator (no external audio assets required) and browser push notifications.
- 🧪 **Built-in Interactive Simulator**: Test clean air, cooking smoke spikes, or hazardous smog conditions without flashing hardware.
- 💾 **Telemetry Data Export**: One-click export of historical telemetry logs to **CSV** or **JSON**.
- 🌓 **Dark / Light Glassmorphism UI**: High-end aesthetic with neon glowing auras and fluid animations.
