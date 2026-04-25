"""
FastAPI Backend Server for Exam Invigilator
Integrates all AI modules and provides WebSocket/REST endpoints for frontend
"""
from fastapi import FastAPI, WebSocket, File, UploadFile, HTTPException, Depends, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import BaseModel, EmailStr
import cv2
import threading
import asyncio
import time
import json
import io
from collections import deque

from .config import (
    SERVER_HOST,
    SERVER_PORT,
    CAMERA_INDEX,
    FRAME_WIDTH,
    FRAME_HEIGHT,
    FRAME_RATE,
)
from .ai_modules import GazeTracker, AudioMonitor, WindowMonitor, AlertManager
from .database import UserManager, TestManager, TestAttemptManager, MalpracticeLogger, init_db
from .auth import create_token, verify_token, verify_teacher, verify_student

# =============================================================================
# PYDANTIC MODELS FOR API
# =============================================================================

class UserRegister(BaseModel):
    """Model for user registration"""
    username: str
    email: str
    password: str
    full_name: str
    role: str  # "teacher" or "student"

class UserLogin(BaseModel):
    """Model for user login"""
    username: str
    password: str

class UserResponse(BaseModel):
    """Model for user response"""
    id: int
    username: str
    email: str
    full_name: str
    role: str

class TestCreate(BaseModel):
    """Model for creating a test"""
    test_name: str
    description: str
    duration_minutes: int
    pass_percentage: float = 40.0

class TestResponse(BaseModel):
    """Model for test response"""
    id: int
    test_name: str
    description: str
    creator_id: int
    duration_minutes: int

# =============================================================================
# GLOBAL STATE
# =============================================================================

class ExamMonitoringSystem:
    """Central monitoring system that orchestrates all AI modules"""
    
    def __init__(self):
        self.gaze_tracker = GazeTracker()
        self.audio_monitor = AudioMonitor()
        self.window_monitor = WindowMonitor()
        self.alert_manager = AlertManager()
        
        self.video_capture = None
        self.is_monitoring = False
        self.monitoring_thread = None
        
        # Real-time telemetry
        self.current_telemetry = {
            "vision": {},
            "audio": {},
            "window": {},
            "focus_score": 100,
            "timestamp": time.time(),
        }
        
        self.telemetry_history = deque(maxlen=1000)
        self.frame_buffer = None
        self.frame_lock = threading.Lock()
        self.frame_ready_event = threading.Event()
        
    def initialize_camera(self):
        """Initialize camera capture"""
        try:
            self.video_capture = cv2.VideoCapture(CAMERA_INDEX)
            self.video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
            self.video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
            self.video_capture.set(cv2.CAP_PROP_FPS, FRAME_RATE)
            
            if not self.video_capture.isOpened():
                print("❌ Camera initialization failed!")
                return False
            
            print(f"✓ Camera initialized: {FRAME_WIDTH}x{FRAME_HEIGHT} @ {FRAME_RATE}FPS")
            return True
        except Exception as e:
            print(f"❌ Camera error: {e}")
            return False
    
    def monitoring_loop(self):
        """Main monitoring loop that runs in a separate thread"""
        print("🎥 Monitoring started...")
        
        while self.is_monitoring:
            try:
                # Capture frame
                ret, frame = self.video_capture.read()
                if not ret:
                    continue
                
                # Frame preprocessing
                frame = cv2.flip(frame, 1)  # Mirror for webcam
                frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
                
                # ===== VISION MODULE =====
                frame_with_gaze, vision_alerts, vision_telemetry = \
                    self.gaze_tracker.detect_face_and_gaze(frame)
                
                # ===== AUDIO MODULE =====
                audio_telemetry, audio_alerts = self.audio_monitor.monitor_audio()
                
                # ===== WINDOW MONITORING MODULE =====
                is_exam_focused, window_alerts, window_telemetry = \
                    self.window_monitor.monitor_window()
                
                # ===== COLLECT ALL ALERTS =====
                all_alerts = vision_alerts + audio_alerts + window_alerts
                self.alert_manager.add_alerts_batch(all_alerts)
                
                # ===== UPDATE TELEMETRY =====
                self.current_telemetry = {
                    "vision": vision_telemetry,
                    "audio": audio_telemetry,
                    "window": window_telemetry,
                    "focus_score": self._calculate_focus_score(),
                    "timestamp": time.time(),
                    "alert_count": len(all_alerts),
                }
                
                self.telemetry_history.append(self.current_telemetry)
                
                # ===== UPDATE FRAME BUFFER =====
                with self.frame_lock:
                    self.frame_buffer = frame_with_gaze
                self.frame_ready_event.set()
                
                # Control frame rate
                time.sleep(1 / FRAME_RATE)
                
            except Exception as e:
                print(f"⚠ Monitoring loop error: {e}")
                time.sleep(0.1)
        
        print("⏹ Monitoring stopped")
    
    def _calculate_focus_score(self):
        """
        Calculate overall focus score (0-100)
        Based on gaze direction, audio levels, and window focus
        """
        score = 100
        
        vision_data = self.current_telemetry.get("vision", {})
        audio_data = self.current_telemetry.get("audio", {})
        window_data = self.current_telemetry.get("window", {})
        
        # Deduct for gaze issues
        if vision_data.get("gaze_direction") != "CENTER":
            score -= 15
        
        # Deduct for audio issues
        if audio_data.get("noise_detected"):
            score -= 20
        
        if audio_data.get("speech_detected"):
            score -= 25
        
        # Deduct for window focus loss
        if not window_data.get("exam_window_active"):
            score -= 30
        
        # Ensure score is in range [0, 100]
        return max(0, min(100, score))
    
    def start_monitoring(self):
        """Start the monitoring system"""
        if not self.initialize_camera():
            return False
        
        self.is_monitoring = True
        self.monitoring_thread = threading.Thread(
            target=self.monitoring_loop,
            daemon=True
        )
        self.monitoring_thread.start()
        return True
    
    def stop_monitoring(self):
        """Stop the monitoring system"""
        self.is_monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        
        if self.video_capture:
            self.video_capture.release()
        
        self.audio_monitor.stop()
        print("✓ Monitoring stopped")
    
    def get_frame(self):
        """Get the current frame with overlays"""
        with self.frame_lock:
            if self.frame_buffer is not None:
                return self.frame_buffer.copy()
        return None
    
    def get_telemetry(self):
        """Get current telemetry data"""
        return {
            **self.current_telemetry,
            "alerts": self.alert_manager.get_dashboard_data(),
        }

# =============================================================================
# FASTAPI APP SETUP
# =============================================================================

# Global monitoring system instance
monitoring_system = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager"""
    global monitoring_system
    
    # Startup
    init_db()  # Initialize database
    monitoring_system = ExamMonitoringSystem()
    if not monitoring_system.start_monitoring():
        print("⚠ Failed to start monitoring system")
    
    yield
    
    # Shutdown
    if monitoring_system:
        monitoring_system.stop_monitoring()

app = FastAPI(
    title="AI-Powered Exam Invigilator",
    description="Real-time exam monitoring system with computer vision and audio analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# REST ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "monitoring": monitoring_system.is_monitoring if monitoring_system else False,
    }

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@app.post("/auth/register")
async def register(user_data: UserRegister):
    """Register a new user (teacher or student)"""
    # Validate role
    if user_data.role not in ["teacher", "student"]:
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")
    
    # Create user
    result = UserManager.create_user(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Create token
    token_data = create_token(result["id"], result["username"], result["role"])
    
    return {
        "message": "User registered successfully",
        "user": result,
        **token_data
    }

@app.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    user = UserManager.authenticate(credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    # Create token
    token_data = create_token(user["id"], user["username"], user["role"])
    
    return {
        "message": "Login successful",
        "user": user,
        **token_data
    }

@app.get("/auth/me")
async def get_current_user(payload: dict = Depends(verify_token)):
    """Get current authenticated user"""
    user = UserManager.get_user(payload["user_id"])
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": user, "role": payload["role"]}

@app.post("/auth/logout")
async def logout(payload: dict = Depends(verify_token)):
    """Logout user (JWT is stateless, so this just returns success)"""
    return {"message": "Logout successful"}

@app.get("/telemetry")
async def get_telemetry():
    """Get current telemetry data"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    return monitoring_system.get_telemetry()

@app.get("/alerts")
async def get_alerts(limit: int = 50, severity: str = None):
    """
    Get alerts
    
    Query parameters:
    - limit: max number of alerts to return
    - severity: filter by severity (HIGH, MEDIUM, LOW)
    """
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    alerts = monitoring_system.alert_manager.get_recent_alerts(limit)
    
    if severity:
        alerts = [a for a in alerts if a.get('severity') == severity]
    
    return {
        "count": len(alerts),
        "alerts": alerts,
        "summary": monitoring_system.alert_manager.get_alert_summary(),
    }

@app.get("/focus-score")
async def get_focus_score():
    """Get current focus score"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    return {
        "focus_score": monitoring_system.current_telemetry.get("focus_score", 0),
        "timestamp": time.time(),
    }

@app.get("/status/vision")
async def get_vision_status():
    """Get vision module status"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    return {
        "module": "vision",
        "data": monitoring_system.current_telemetry.get("vision", {}),
        "status": "active" if monitoring_system.is_monitoring else "inactive",
    }

@app.get("/status/audio")
async def get_audio_status():
    """Get audio module status"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    return {
        "module": "audio",
        "data": monitoring_system.current_telemetry.get("audio", {}),
        "status": "active" if monitoring_system.is_monitoring else "inactive",
    }

@app.get("/status/window")
async def get_window_status():
    """Get window monitoring status"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    return {
        "module": "window",
        "data": monitoring_system.current_telemetry.get("window", {}),
        "status": "active" if monitoring_system.is_monitoring else "inactive",
    }

@app.post("/monitoring/start")
async def start_monitoring_endpoint():
    """Start monitoring system"""
    if monitoring_system.is_monitoring:
        return {"status": "already_running"}
    
    success = monitoring_system.start_monitoring()
    return {
        "status": "started" if success else "failed",
        "monitoring": monitoring_system.is_monitoring,
    }

@app.post("/monitoring/stop")
async def stop_monitoring_endpoint():
    """Stop monitoring system"""
    monitoring_system.stop_monitoring()
    return {
        "status": "stopped",
        "monitoring": monitoring_system.is_monitoring,
    }

@app.post("/alerts/clear")
async def clear_alerts():
    """Clear all active alerts"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    monitoring_system.alert_manager.clear_alerts()
    return {"status": "cleared"}

# =============================================================================
# TEST MANAGEMENT ENDPOINTS (TEACHER ONLY)
# =============================================================================

@app.post("/tests/create")
async def create_test(test_data: TestCreate, payload: dict = Depends(verify_teacher)):
    """Create a new test (teacher only)"""
    result = TestManager.create_test(
        test_name=test_data.test_name,
        description=test_data.description,
        creator_id=payload["user_id"],
        duration_minutes=test_data.duration_minutes,
        pass_percentage=test_data.pass_percentage
    )
    
    return {
        "message": "Test created successfully",
        "test": result
    }

@app.get("/tests/my-tests")
async def get_my_tests(payload: dict = Depends(verify_teacher)):
    """Get all tests created by current teacher"""
    tests = TestManager.get_all_tests(creator_id=payload["user_id"])
    
    return {
        "count": len(tests),
        "tests": tests
    }

@app.get("/tests/{test_id}")
async def get_test(test_id: int):
    """Get test details"""
    test = TestManager.get_test(test_id)
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {"test": test}

@app.get("/tests")
async def list_tests():
    """Get all active tests (for student browsing)"""
    tests = TestManager.get_all_tests()
    
    return {
        "count": len(tests),
        "tests": tests
    }

@app.post("/tests/{test_id}/start")
async def start_test(test_id: int, payload: dict = Depends(verify_student)):
    """Start a test attempt (student only)"""
    test = TestManager.get_test(test_id)
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Create test attempt
    attempt = TestAttemptManager.create_attempt(test_id, payload["user_id"])
    
    return {
        "message": "Test started",
        "attempt": attempt,
        "test": test
    }

@app.post("/tests/attempts/{attempt_id}/finish")
async def finish_test(attempt_id: int, score: float = 0, payload: dict = Depends(verify_student)):
    """Finish a test attempt (student only)"""
    attempt = TestAttemptManager.get_attempt(attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
    
    if attempt["student_id"] != payload["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot finish another user's test")
    
    # Finish attempt
    TestAttemptManager.finish_attempt(attempt_id, score=score)
    
    return {
        "message": "Test submitted successfully",
        "attempt_id": attempt_id
    }

@app.get("/tests/{test_id}/attempts")
async def get_test_attempts(test_id: int, payload: dict = Depends(verify_teacher)):
    """Get all attempts for a test (teacher only)"""
    test = TestManager.get_test(test_id)
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["creator_id"] != payload["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot access other teacher's tests")
    
    attempts = TestAttemptManager.get_test_attempts(test_id)
    
    return {
        "test_id": test_id,
        "count": len(attempts),
        "attempts": attempts
    }

@app.get("/tests/{test_id}/malpractice-summary")
async def get_malpractice_summary(test_id: int, payload: dict = Depends(verify_teacher)):
    """Get malpractice summary for a test (teacher only)"""
    test = TestManager.get_test(test_id)
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["creator_id"] != payload["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot access other teacher's tests")
    
    summary = MalpracticeLogger.get_test_malpractice_summary(test_id)
    
    return {
        "test_id": test_id,
        "malpractice_summary": summary
    }

@app.get("/student/my-attempts")
async def get_my_attempts(payload: dict = Depends(verify_student)):
    """Get all test attempts for current student"""
    attempts = TestAttemptManager.get_student_attempts(payload["user_id"])
    
    return {
        "count": len(attempts),
        "attempts": attempts
    }

# =============================================================================
# VIDEO STREAMING ENDPOINTS
# =============================================================================

@app.get("/video-stream")
async def video_stream():
    """
    Stream video feed with real-time overlays
    MJPEG streaming for browser compatibility
    """
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    async def frame_generator():
        while monitoring_system.is_monitoring:
            frame = monitoring_system.get_frame()
            
            if frame is None:
                await asyncio.sleep(0.05)
                continue
            
            # Add telemetry overlay on frame
            telemetry = monitoring_system.current_telemetry
            
            # Add focus score
            focus_score = telemetry.get("focus_score", 0)
            color = (0, 255, 0) if focus_score > 70 else (0, 165, 255) if focus_score > 40 else (0, 0, 255)
            cv2.putText(
                frame,
                f"Focus Score: {focus_score:.0f}%",
                (10, FRAME_HEIGHT - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2,
            )
            
            # Encode frame to JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            
            # MJPEG format
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n'
                b'Content-length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n'
                + frame_bytes + b'\r\n'
            )
            
            await asyncio.sleep(1 / FRAME_RATE)
    
    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# =============================================================================
# WEBSOCKET FOR REAL-TIME UPDATES
# =============================================================================

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """WebSocket for real-time telemetry streaming"""
    await websocket.accept()
    
    try:
        while True:
            if monitoring_system and monitoring_system.is_monitoring:
                telemetry = monitoring_system.get_telemetry()
                await websocket.send_json(telemetry)
            
            await asyncio.sleep(0.5)  # Send every 500ms
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket for real-time alert streaming"""
    await websocket.accept()
    
    last_alert_count = 0
    
    try:
        while True:
            if monitoring_system:
                alerts_data = monitoring_system.alert_manager.get_dashboard_data()
                current_count = alerts_data['total_alerts']
                
                # Only send if there are new alerts
                if current_count != last_alert_count or current_count > 0:
                    await websocket.send_json(alerts_data)
                    last_alert_count = current_count
            
            await asyncio.sleep(1)  # Check every second
    except Exception as e:
        print(f"WebSocket alert error: {e}")
    finally:
        await websocket.close()

# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.get("/telemetry-history")
async def get_telemetry_history(duration: int = 60):
    """Get telemetry history for the last N seconds"""
    if not monitoring_system:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    current_time = time.time()
    history = [
        t for t in monitoring_system.telemetry_history
        if (current_time - t['timestamp']) < duration
    ]
    
    return {
        "duration_seconds": duration,
        "samples": len(history),
        "history": list(history),
    }

@app.get("/config")
async def get_config():
    """Get system configuration"""
    return {
        "camera": {
            "width": FRAME_WIDTH,
            "height": FRAME_HEIGHT,
            "fps": FRAME_RATE,
            "index": CAMERA_INDEX,
        },
        "server": {
            "host": SERVER_HOST,
            "port": SERVER_PORT,
        },
    }

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║  AI-Powered Offline Exam Invigilator                     ║
    ║  Starting server at http://{SERVER_HOST}:{SERVER_PORT}        ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        app,
        host=SERVER_HOST,
        port=SERVER_PORT,
        log_level="info",
    )
