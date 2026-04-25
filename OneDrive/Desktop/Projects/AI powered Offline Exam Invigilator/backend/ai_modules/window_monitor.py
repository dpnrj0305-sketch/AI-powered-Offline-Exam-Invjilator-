"""
Window Monitoring Module: Detects when exam window loses focus or tabs are switched
Uses OS-level window monitoring to track active windows.
"""
import pygetwindow as gw
import psutil
import threading
import time
from ..config import EXAM_WINDOW_NAME, WINDOW_CHECK_INTERVAL

class WindowMonitor:
    """
    Monitors active window and detects unauthorized window switches
    """

    def __init__(self, exam_window_keyword=EXAM_WINDOW_NAME):
        self.exam_window_keyword = exam_window_keyword.lower()
        self.current_active_window = None
        self.exam_window_lost_time = None
        self.is_exam_window_active = False
        self.unauthorized_windows = []
        self.last_check_time = time.time()
        
    def find_exam_window(self):
        """
        Find the exam window based on title keyword
        Returns: window object or None
        """
        try:
            all_windows = gw.getAllWindows()
            for window in all_windows:
                if self.exam_window_keyword in window.title.lower():
                    return window
            return None
        except Exception as e:
            print(f"⚠ Window search error: {e}")
            return None
    
    def get_active_window(self):
        """
        Get the currently active/focused window
        Returns: window title (str)
        """
        try:
            active_window = gw.getActiveWindow()
            if active_window:
                return active_window.title
            return "Unknown"
        except Exception as e:
            print(f"⚠ Active window detection error: {e}")
            return "Unknown"
    
    def is_exam_focused(self):
        """
        Check if exam window is currently in focus
        Returns: boolean
        """
        try:
            active_title = self.get_active_window()
            return self.exam_window_keyword in active_title.lower()
        except Exception as e:
            print(f"⚠ Focus check error: {e}")
            return False
    
    def get_suspicious_processes(self):
        """
        Detect suspicious processes that might indicate cheating
        Common suspicious apps: browsers (other than exam), messaging, chat apps, etc.
        
        Returns: list of suspicious process names
        """
        suspicious_keywords = [
            'python', 'node', 'powershell', 'cmd', 'terminal', 'putty',
            'slack', 'whatsapp', 'telegram', 'discord', 'zoom', 'skype',
            'filezilla', 'mremoteng', 'chrome', 'firefox', 'safari',
            'google drive', 'github', 'stackoverflow'
        ]
        
        suspicious_processes = []
        
        try:
            for proc in psutil.process_iter(['name']):
                try:
                    process_name = proc.info['name'].lower()
                    for keyword in suspicious_keywords:
                        if keyword in process_name:
                            suspicious_processes.append(process_name)
                            break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            print(f"⚠ Process scanning error: {e}")
        
        return list(set(suspicious_processes))
    
    def monitor_window(self):
        """
        Check current window focus and detect unauthorized activity
        Returns: (is_focused, alerts, telemetry)
        """
        alerts = []
        telemetry = {
            "exam_window_active": False,
            "active_window_title": None,
            "time_since_focus_lost": 0,
            "suspicious_processes": [],
        }
        
        try:
            active_window_title = self.get_active_window()
            telemetry["active_window_title"] = active_window_title
            
            is_exam_focused = self.is_exam_focused()
            telemetry["exam_window_active"] = is_exam_focused
            
            if is_exam_focused:
                # Exam window is in focus - good
                self.exam_window_lost_time = None
                self.is_exam_window_active = True
            else:
                # Exam window lost focus
                if self.exam_window_lost_time is None:
                    self.exam_window_lost_time = time.time()
                
                time_since_lost = time.time() - self.exam_window_lost_time
                telemetry["time_since_focus_lost"] = time_since_lost
                
                alerts.append({
                    "type": "WINDOW_FOCUS_LOST",
                    "severity": "HIGH",
                    "message": f"Exam window lost focus. Current: {active_window_title}",
                    "timestamp": time.time(),
                    "active_window": active_window_title,
                    "duration": time_since_lost,
                })
                
                self.is_exam_window_active = False
            
            # Check for suspicious processes
            suspicious = self.get_suspicious_processes()
            telemetry["suspicious_processes"] = suspicious
            
            if suspicious:
                alerts.append({
                    "type": "SUSPICIOUS_PROCESS",
                    "severity": "MEDIUM",
                    "message": f"Suspicious processes detected: {', '.join(suspicious[:3])}",
                    "timestamp": time.time(),
                    "processes": suspicious,
                })
            
        except Exception as e:
            print(f"⚠ Window monitoring error: {e}")
        
        self.last_check_time = time.time()
        return self.is_exam_window_active, alerts, telemetry
    
    def reset(self):
        """Reset window monitor state"""
        self.exam_window_lost_time = None
        self.is_exam_window_active = False
        self.unauthorized_windows = []
