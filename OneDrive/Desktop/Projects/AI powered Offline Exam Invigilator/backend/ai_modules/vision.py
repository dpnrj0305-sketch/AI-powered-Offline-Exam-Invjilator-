"""
Vision Module: Face Detection & Gaze Tracking using MediaPipe and OpenCV
Detects eye gaze direction and flags when student looks away from screen.
"""
import cv2
import numpy as np
from collections import deque
import threading
import time

# Try different MediaPipe import approaches
try:
    from mediapipe.python import solutions as mp_solutions
    mp_face_mesh_module = mp_solutions.face_mesh
    mp_drawing_module = mp_solutions.drawing_utils
    MP_AVAILABLE = True
except ImportError:
    try:
        import mediapipe.tasks.python.vision as vision
        MP_AVAILABLE = True
        print("⚠ Using alternative MediaPipe import")
    except ImportError:
        MP_AVAILABLE = False
        print("⚠ MediaPipe not properly configured - gaze tracking disabled")

from ..config import (
    GAZE_LOOK_AWAY_THRESHOLD,
    MIN_FACE_DETECTION_CONFIDENCE,
    MIN_PRESENCE_CONFIDENCE,
    FRAME_WIDTH,
    FRAME_HEIGHT,
)

class GazeTracker:
    """
    Real-time gaze tracking using MediaPipe's FaceMesh
    Detects whether the student is looking at the screen or looking away
    """

    def __init__(self):
        self.face_mesh = None
        self.mp_drawing = None
        self.mp_face_mesh = None
        
        if not MP_AVAILABLE:
            print("⚠ Gaze tracking disabled - MediaPipe not available")
            return
        
        try:
            self.mp_face_mesh = mp_face_mesh_module
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=MIN_FACE_DETECTION_CONFIDENCE,
                min_tracking_confidence=MIN_PRESENCE_CONFIDENCE,
            )
            self.mp_drawing = mp_drawing_module
        except Exception as e:
            print(f"⚠ MediaPipe initialization error: {e}")
            self.face_mesh = None
            self.mp_drawing = None
            self.mp_face_mesh = None
        
        # Gaze tracking state
        self.look_away_start_time = None
        self.is_looking_away = False
        self.gaze_history = deque(maxlen=10)
        
        # Key facial landmarks
        self.LEFT_EYE = [33, 133]
        self.RIGHT_EYE = [362, 263]
        self.NOSE = [1]
        self.FOREHEAD = [10]
        
    def calculate_gaze_direction(self, landmarks, frame_shape):
        """
        Calculate the direction of gaze based on eye landmarks
        Returns: "CENTER", "LEFT", "RIGHT", "UP", "DOWN"
        """
        h, w, _ = frame_shape
        
        left_eye = np.array([landmarks[self.LEFT_EYE[0]], landmarks[self.LEFT_EYE[1]]])
        right_eye = np.array([landmarks[self.RIGHT_EYE[0]], landmarks[self.RIGHT_EYE[1]]])
        nose = landmarks[self.NOSE[0]]
        
        # Calculate eye centers
        left_eye_center = (left_eye[0] + left_eye[1]) / 2
        right_eye_center = (right_eye[0] + right_eye[1]) / 2
        
        # Calculate nose position (normalized)
        nose_x = nose.x * w
        nose_y = nose.y * h
        
        # Calculate average eye position
        eye_center_x = (left_eye_center[0].x * w + right_eye_center[0].x * w) / 2
        eye_center_y = (left_eye_center[0].y * h + right_eye_center[0].y * h) / 2
        
        # Determine gaze direction
        dx = eye_center_x - nose_x
        dy = eye_center_y - nose_y
        
        threshold = 30
        
        if abs(dx) < threshold and abs(dy) < threshold:
            return "CENTER", 0.9
        elif abs(dy) > abs(dx):
            if dy < 0:
                return "UP", 0.7
            else:
                return "DOWN", 0.7
        else:
            if dx < 0:
                return "RIGHT", 0.7  # Looking to the right (eyes moved right)
            else:
                return "LEFT", 0.7   # Looking to the left (eyes moved left)
    
    def detect_face_and_gaze(self, frame):
        """
        Process frame and detect face with gaze direction
        Returns: (frame_with_overlay, alerts_list, telemetry)
        """
        alerts = []
        telemetry = {
            "face_detected": False,
            "gaze_direction": None,
            "looking_away_duration": 0,
            "landmarks_visible": False,
        }
        
        frame_with_overlay = frame.copy()
        
        # If MediaPipe is not available, return empty telemetry
        if not self.face_mesh:
            cv2.putText(
                frame_with_overlay,
                "Gaze tracking unavailable",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 165, 0),
                2,
            )
            return frame_with_overlay, alerts, telemetry
        
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
        
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    telemetry["face_detected"] = True
                    telemetry["landmarks_visible"] = True
                    
                    # Convert landmarks to image coordinates
                    landmarks_list = []
                    for landmark in face_landmarks.landmark:
                        landmarks_list.append(landmark)
                    
                    # Calculate gaze direction
                    gaze_direction, confidence = self.calculate_gaze_direction(
                        landmarks_list, frame.shape
                    )
                    telemetry["gaze_direction"] = gaze_direction
                    
                    self.gaze_history.append(gaze_direction)
                    
                    # Check if looking away (not CENTER)
                    if gaze_direction != "CENTER":
                        if self.look_away_start_time is None:
                            self.look_away_start_time = time.time()
                        
                        look_away_duration = time.time() - self.look_away_start_time
                        telemetry["looking_away_duration"] = look_away_duration
                        
                        if look_away_duration > GAZE_LOOK_AWAY_THRESHOLD:
                            self.is_looking_away = True
                            alerts.append({
                                "type": "GAZE_ALERT",
                                "severity": "HIGH",
                                "message": f"Student looking away: {gaze_direction} for {look_away_duration:.1f}s",
                                "timestamp": time.time(),
                                "duration": look_away_duration,
                            })
                    else:
                        # Reset when looking at center
                        self.look_away_start_time = None
                        self.is_looking_away = False
                    
                    # Draw face mesh
                    self.mp_drawing.draw_landmarks(
                        frame_with_overlay,
                        face_landmarks,
                        self.mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=self.mp_drawing.DrawingSpec(
                            color=(0, 255, 0), thickness=1, circle_radius=1
                        ),
                        connection_drawing_spec=self.mp_drawing.DrawingSpec(
                            color=(0, 255, 0), thickness=1
                        ),
                    )
                    
                    # Draw gaze direction indicator
                    h, w, _ = frame.shape
                    center = (w // 2, h // 2)
                    
                    # Color based on gaze direction
                    color = (0, 255, 0) if gaze_direction == "CENTER" else (0, 165, 255)
                    cv2.circle(frame_with_overlay, center, 10, color, -1)
                    
                    # Add text label
                    cv2.putText(
                        frame_with_overlay,
                        f"Gaze: {gaze_direction}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0) if gaze_direction == "CENTER" else (0, 0, 255),
                        2,
                    )
                    
                    if self.is_looking_away:
                        cv2.putText(
                            frame_with_overlay,
                            "⚠ LOOKING AWAY",
                            (10, 70),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            1,
                            (0, 0, 255),
                            2,
                        )
            else:
                # No face detected
                cv2.putText(
                    frame_with_overlay,
                    "No face detected",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                )
        
        except Exception as e:
            print(f"⚠ Gaze tracking error: {e}")
            cv2.putText(
                frame_with_overlay,
                "Gaze tracking error",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 165, 255),
                2,
            )
        
        return frame_with_overlay, alerts, telemetry
    
    def reset(self):
        """Reset gaze tracker state"""
        self.look_away_start_time = None
        self.is_looking_away = False
        self.gaze_history.clear()
