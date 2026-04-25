"""
Alert Management System
Centralized alert handling, filtering, and storage
"""
from collections import deque
from datetime import datetime, timedelta
import threading
import time
from ..config import ALERT_RETENTION_TIME, MAX_ALERTS_IN_QUEUE

class AlertManager:
    """
    Manages alerts from all monitoring modules
    Stores, filters, and prioritizes alerts
    """

    def __init__(self):
        self.alerts = deque(maxlen=MAX_ALERTS_IN_QUEUE)
        self.alert_history = deque(maxlen=1000)
        self.lock = threading.Lock()
        
        self.alert_counts = {
            "GAZE_ALERT": 0,
            "AUDIO_NOISE_ALERT": 0,
            "SPEECH_DETECTED": 0,
            "WINDOW_FOCUS_LOST": 0,
            "SUSPICIOUS_PROCESS": 0,
        }
        
        self.severity_levels = {
            "CRITICAL": 4,
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1,
            "INFO": 0,
        }
    
    def add_alert(self, alert):
        """
        Add a new alert to the system
        
        Alert structure:
        {
            "type": str,
            "severity": str,
            "message": str,
            "timestamp": float,
            "data": dict (optional extra data)
        }
        """
        with self.lock:
            alert['timestamp'] = time.time()
            alert['id'] = len(self.alert_history)
            
            self.alerts.append(alert)
            self.alert_history.append(alert)
            
            if alert['type'] in self.alert_counts:
                self.alert_counts[alert['type']] += 1
    
    def add_alerts_batch(self, alerts_list):
        """Add multiple alerts at once"""
        for alert in alerts_list:
            self.add_alert(alert)
    
    def get_active_alerts(self):
        """
        Get all active alerts (within retention time)
        Returns: list of alerts sorted by timestamp (newest first)
        """
        with self.lock:
            current_time = time.time()
            active_alerts = [
                alert for alert in self.alerts
                if (current_time - alert['timestamp']) < ALERT_RETENTION_TIME
            ]
            return sorted(active_alerts, key=lambda x: x['timestamp'], reverse=True)
    
    def get_recent_alerts(self, limit=50):
        """Get the N most recent alerts"""
        with self.lock:
            return list(self.alerts)[::-1][:limit]
    
    def get_alerts_by_type(self, alert_type):
        """Get all alerts of a specific type"""
        with self.lock:
            return [alert for alert in self.alerts if alert['type'] == alert_type]
    
    def get_alerts_by_severity(self, severity):
        """Get alerts of a specific severity level"""
        with self.lock:
            return [alert for alert in self.alerts if alert['severity'] == severity]
    
    def get_high_priority_alerts(self):
        """Get all HIGH and CRITICAL severity alerts"""
        with self.lock:
            return [
                alert for alert in self.alerts
                if alert['severity'] in ['HIGH', 'CRITICAL']
            ]
    
    def clear_alerts(self):
        """Clear all alerts"""
        with self.lock:
            self.alerts.clear()
    
    def get_alert_summary(self):
        """
        Get summary statistics about alerts
        Returns: dict with counts and insights
        """
        with self.lock:
            summary = {
                "total_active_alerts": len(self.alerts),
                "total_alerts_ever": len(self.alert_history),
                "counts_by_type": self.alert_counts.copy(),
                "high_priority_count": len(
                    [a for a in self.alerts if a['severity'] in ['HIGH', 'CRITICAL']]
                ),
                "alert_rate": len(self.alerts) / max(1, ALERT_RETENTION_TIME),
            }
            return summary
    
    def get_dashboard_data(self):
        """
        Get all data needed for dashboard display
        Returns: formatted dict suitable for frontend
        """
        active_alerts = self.get_active_alerts()
        summary = self.get_alert_summary()
        
        return {
            "timestamp": time.time(),
            "total_alerts": len(active_alerts),
            "alerts": [
                {
                    "id": alert.get('id'),
                    "type": alert['type'],
                    "severity": alert['severity'],
                    "message": alert['message'],
                    "timestamp": alert['timestamp'],
                    "age_seconds": time.time() - alert['timestamp'],
                }
                for alert in active_alerts[:100]  # Limit to 100 for performance
            ],
            "summary": summary,
        }
    
    def reset(self):
        """Reset all alert statistics"""
        with self.lock:
            self.alerts.clear()
            for key in self.alert_counts:
                self.alert_counts[key] = 0
