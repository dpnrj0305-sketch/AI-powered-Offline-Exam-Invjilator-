# 🔐 AI-Powered Offline Exam Invigilator

A comprehensive, real-time exam monitoring system combining computer vision, audio analysis, and window monitoring to detect suspicious student behavior during digital exams.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the System](#-running-the-system)
- [API Documentation](#-api-documentation)
- [Pro Mode Dashboard](#-pro-mode-dashboard)
- [Alert Types](#-alert-types)
- [Performance & Optimization](#-performance--optimization)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🎥 **Vision Module (Gaze & Face Tracking)**
- Real-time face detection using MediaPipe's FaceMesh
- Gaze direction tracking (CENTER, LEFT, RIGHT, UP, DOWN)
- Automatic flagging when student looks away for > 3 seconds
- Face mesh visualization on video stream
- Confidence scoring for face detection

### 🔊 **Audio Analysis Module**
- Real-time microphone monitoring
- **Noise level detection** (dB thresholds)
- **Speech detection** using frequency domain analysis
- Human voice pattern recognition
- Alerts for excessive noise or unauthorized speech

### 🪟 **Window Monitoring Module**
- Active window tracking
- Exam window focus loss detection
- Suspicious process detection (message apps, browsers, development tools)
- Background monitoring without interruption

### 📊 **Pro Mode Interactive Dashboard**
- **Live Video Feed**: Real-time student camera stream with AI overlays
- **Real-Time Telemetry Sidebar**: Focus score, noise level, gaze direction, window status
- **Live Alert Log**: Scrolling colored alerts sorted by severity
- **Analytics Dashboard**: Charts, metrics, and performance radar
- **System Controls**: Start/stop monitoring, clear alerts, refresh data
- **Professional Dark Theme**: Sleek, modern UI optimized for proctors

### 📈 **Focus Score Calculation**
- Weighted scoring based on:
  - Gaze direction (eye focus)
  - Audio levels (noise/speech)
  - Window focus (exam window active)
  - Overall stability

---

## 🛠 Tech Stack

### **Backend**
- **Python 3.9+**
- **FastAPI** - Modern async web framework
- **OpenCV** - Video processing & image capture
- **MediaPipe** - Face mesh & landmark detection
- **PyAudio** - Audio stream capture
- **SpeechRecognition** - Speech pattern analysis
- **psutil** & **pygetwindow** - System monitoring
- **Uvicorn** - ASGI server
- **NumPy & SciPy** - Scientific computing

### **Frontend**
- **React 18** - UI framework
- **Recharts** - Real-time data visualization
- **Axios** - HTTP client
- **React Icons** - UI icon library
- **WebSocket** - Real-time updates

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Exam Invigilator System                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Vision      │  │   Audio      │  │   Window     │ │
│  │  Module      │  │   Module     │  │   Monitor    │ │
│  │  (Face/Gaze)│  │  (Noise/Talk)│  │ (Focus Loss) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                   │         │
│         └─────────┬───────┴───────────────────┘         │
│                   │                                     │
│            ┌──────▼──────┐                              │
│            │Alert Manager│                              │
│            │  (Filtering)│                              │
│            └──────┬──────┘                              │
│                   │                                     │
│         ┌─────────▼──────────┐                          │
│         │   FastAPI Server   │                          │
│         │  (REST + WebSocket)│                          │
│         └─────────┬──────────┘                          │
│                   │                                     │
│         ┌─────────▼──────────┐                          │
│         │  React Dashboard   │                          │
│         │  (Video + Analytics)                          │
│         └────────────────────┘                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Step 1: Clone/Setup Project
```bash
cd "AI powered Offline Exam Invigilator"
```

### Step 2: Create Python Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## ⚙ Configuration

### Backend Configuration (`.env`)
Located in `backend/.env`

```env
# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=8000

# Vision - Adjust gaze sensitivity
GAZE_LOOK_AWAY_THRESHOLD=3        # seconds before alert
FACE_DETECTION_CONFIDENCE=0.7      # 0-1, higher = stricter

# Audio - Adjust sensitivity
AUDIO_THRESHOLD_DB=50             # dB level for noise alert
SPEECH_DETECTION_THRESHOLD=0.6    # 0-1, confidence threshold

# Camera
FRAME_RATE=30                      # FPS for processing
FRAME_WIDTH=640                    # Resolution
FRAME_HEIGHT=480

# Alert management
ALERT_RETENTION_TIME=300           # seconds (5 minutes)
MAX_ALERTS_IN_QUEUE=500            # max concurrent alerts
```

### Tuning Thresholds

**For Stricter Monitoring:**
- `GAZE_LOOK_AWAY_THRESHOLD` → 2 (alert faster)
- `AUDIO_THRESHOLD_DB` → 40 (more noise sensitive)
- `SPEECH_DETECTION_THRESHOLD` → 0.5 (detect softer speech)

**For More Relaxed Monitoring:**
- `GAZE_LOOK_AWAY_THRESHOLD` → 5 (tolerance for glances)
- `AUDIO_THRESHOLD_DB` → 60 (allow more background noise)
- `SPEECH_DETECTION_THRESHOLD` → 0.7 (only clear speech)

---

## 🎯 Running the System

### Start Backend Server
```bash
cd backend
python main.py
```

Expected output:
```
╔══════════════════════════════════════════════════════════╗
║  AI-Powered Offline Exam Invigilator                     ║
║  Starting server at http://127.0.0.1:8000        ║
╚══════════════════════════════════════════════════════════╝
```

### Start Frontend (in new terminal)
```bash
cd frontend
npm start
```

The Pro Mode dashboard will open at `http://localhost:3000`

### System Health Check
```bash
# Health endpoint
curl http://localhost:8000/health
```

---

## 📡 API Documentation

### REST Endpoints

#### **Health & Status**
```
GET /health
GET /telemetry
GET /focus-score
GET /status/vision
GET /status/audio
GET /status/window
GET /config
```

#### **Monitoring Control**
```
POST /monitoring/start
POST /monitoring/stop
POST /alerts/clear
```

#### **Data Retrieval**
```
GET /alerts?limit=50&severity=HIGH
GET /telemetry-history?duration=60
```

#### **Video & Streaming**
```
GET /video-stream (MJPEG stream)
```

### WebSocket Endpoints

**Real-Time Telemetry Updates**
```
ws://localhost:8000/ws/telemetry
```

**Real-Time Alert Stream**
```
ws://localhost:8000/ws/alerts
```

### Example API Calls

**Get current focus score:**
```bash
curl http://localhost:8000/focus-score
```

**Get recent alerts:**
```bash
curl "http://localhost:8000/alerts?limit=10&severity=HIGH"
```

**Get telemetry history:**
```bash
curl "http://localhost:8000/telemetry-history?duration=60"
```

---

## 📊 Pro Mode Dashboard

### Layout Components

1. **Header Bar**
   - System status indicator
   - Monitoring toggle button
   - Control buttons (Clear, Refresh)

2. **Main Content Area**
   - **Video Feed**: Live student webcam with gaze/face overlays
   - **Analytics Dashboard**: Real-time charts and metrics

3. **Right Sidebar**
   - **Telemetry Sidebar**: Live metrics
     - Focus Score (large animated display)
     - Vision data (gaze, face detection)
     - Audio data (noise level, speech detection)
     - Window status (focus, active app)
   
   - **Alert Log**: Live alert stream
     - Color-coded by severity (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)
     - Timestamp and duration
     - Quick summary statistics

4. **Visualizations**
   - Focus score gauge (animated, color-coded)
   - Performance radar chart
   - Alert distribution bar chart
   - Real-time line charts (with Recharts)

---

## 🚨 Alert Types

| Alert Type | Severity | Trigger | Action |
|-----------|----------|---------|--------|
| **GAZE_ALERT** | HIGH | Looking away > 3s | Visual indicator, logged |
| **AUDIO_NOISE_ALERT** | MEDIUM | Noise > 50dB | Audio spike highlight |
| **SPEECH_DETECTED** | HIGH | Speech confidence > 0.6 | Immediate alert |
| **WINDOW_FOCUS_LOST** | HIGH | Exam window unfocused | Red alert highlight |
| **SUSPICIOUS_PROCESS** | MEDIUM | Banned app detected | Process list shown |

### Alert Lifecycle
1. **Generated** by monitoring modules
2. **Aggregated** by Alert Manager
3. **Stored** in circular buffer (newest 500)
4. **Streamed** to dashboard via WebSocket
5. **Displayed** with color-coding and timestamp
6. **Retained** for 5 minutes (configurable)

---

## ⚡ Performance & Optimization

### Processing Pipeline
```
Video Capture (30 FPS)
    ↓
Face Detection (MediaPipe)
    ↓
Gaze Calculation
    ↓
Audio Processing (44.1 kHz)
    ↓
Frequency Analysis
    ↓
Window Monitoring (1/sec)
    ↓
Alert Generation
    ↓
WebSocket Stream → Dashboard
```

### Performance Metrics
- **Vision Module**: ~30ms per frame @ 640x480
- **Audio Module**: ~50ms per chunk @ 44.1kHz
- **Window Monitor**: ~10ms check (1/sec)
- **Total Latency**: ~100-150ms end-to-end

### Optimization Tips
1. **Reduce Frame Rate** if CPU usage > 80%
2. **Lower Resolution** for slower computers
3. **Increase Thresholds** to reduce false positives
4. **Limit Active Alerts** to recent 50 in dashboard

---

## 🐛 Troubleshooting

### Camera Not Detected
```python
# Check available cameras
import cv2
for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f"Camera {i} available")
        cap.release()
```

### Audio Issues
```bash
# Test audio input on Windows
# Settings → Sound → Input devices → Test microphone

# On Linux
arecord -l  # List audio devices
```

### API Connection Errors
1. Verify backend is running: `http://localhost:8000/health`
2. Check firewall allows port 8000
3. Ensure CORS is enabled in FastAPI
4. Browser console will show WebSocket errors

### High CPU Usage
- Reduce `FRAME_RATE` to 15-20
- Lower `FRAME_WIDTH` and `FRAME_HEIGHT`
- Monitor background processes
- Run on dedicated machine if possible

### Alerts Not Appearing
1. Check monitoring is started (`/monitoring/start`)
2. Verify WebSocket connection in browser DevTools
3. Ensure alert thresholds are reasonable
4. Check browser console for JavaScript errors

---

## 📝 License

Private Educational Use. For institutional exams only.

## 👨‍💻 Support

For issues or feature requests, check the documentation or review configuration settings.

---

## 🎓 Educational Notes

This system demonstrates integration of:
- **Computer Vision** (MediaPipe, OpenCV)
- **Real-Time Processing** (async Python, WebSockets)
- **Audio Analysis** (frequency domain, voice detection)
- **System Monitoring** (OS-level API calls)
- **Full-Stack Development** (Python backend, React frontend)
- **Responsive UI** (CSS Grid, animations, real-time charts)

### Ethical Considerations
- **Privacy**: Ensure compliance with privacy laws
- **Consent**: Students must consent to monitoring
- **Transparency**: Make monitoring parameters visible
- **Fairness**: Thresholds should be reasonable and consistent
- **Security**: Protect recorded data and access logs

---

**Version**: 1.0.0  
**Last Updated**: April 2026
