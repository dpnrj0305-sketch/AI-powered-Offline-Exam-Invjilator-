"""
Configuration settings for the Exam Invigilator System
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Server Settings
SERVER_HOST = os.getenv("SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))
DEBUG = os.getenv("DEBUG", False)

# Vision Settings
GAZE_LOOK_AWAY_THRESHOLD = int(os.getenv("GAZE_LOOK_AWAY_THRESHOLD", 3))  # seconds
FACE_DETECTION_CONFIDENCE = float(os.getenv("FACE_DETECTION_CONFIDENCE", 0.7))
MIN_FACE_DETECTION_CONFIDENCE = float(os.getenv("MIN_FACE_DETECTION_CONFIDENCE", 0.5))
MIN_PRESENCE_CONFIDENCE = float(os.getenv("MIN_PRESENCE_CONFIDENCE", 0.5))

# Audio Settings
AUDIO_THRESHOLD_DB = int(os.getenv("AUDIO_THRESHOLD_DB", 50))  # decibels
BACKGROUND_NOISE_THRESHOLD_DB = int(os.getenv("BACKGROUND_NOISE_THRESHOLD_DB", 35))
SPEECH_DETECTION_THRESHOLD = float(os.getenv("SPEECH_DETECTION_THRESHOLD", 0.6))
AUDIO_CHECK_INTERVAL = int(os.getenv("AUDIO_CHECK_INTERVAL", 5))  # seconds

# Window Monitoring Settings
EXAM_WINDOW_NAME = os.getenv("EXAM_WINDOW_NAME", "exam")  # keyword to identify exam window
WINDOW_CHECK_INTERVAL = int(os.getenv("WINDOW_CHECK_INTERVAL", 1))  # seconds

# Camera Settings
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", 0))
FRAME_RATE = int(os.getenv("FRAME_RATE", 30))
FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", 640))
FRAME_HEIGHT = int(os.getenv("FRAME_HEIGHT", 480))

# Alert Settings
ALERT_RETENTION_TIME = int(os.getenv("ALERT_RETENTION_TIME", 300))  # 5 minutes in seconds
MAX_ALERTS_IN_QUEUE = int(os.getenv("MAX_ALERTS_IN_QUEUE", 500))

# Focus Score Calculation
FOCUS_SCORE_DECAY = float(os.getenv("FOCUS_SCORE_DECAY", 0.95))  # exponential decay factor
MAX_FOCUS_SCORE = 100
MIN_FOCUS_SCORE = 0

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "invigilator.log")

# Database Settings
DB_PATH = os.getenv("DB_PATH", "data/invigilator.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# JWT Settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))

print(f"✓ Configuration loaded: {SERVER_HOST}:{SERVER_PORT}")
