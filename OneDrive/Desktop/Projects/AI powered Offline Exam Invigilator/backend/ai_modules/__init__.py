"""
AI Modules Package
Contains all computer vision, audio, and monitoring modules
"""

from .vision import GazeTracker
from .audio import AudioMonitor
from .window_monitor import WindowMonitor
from .alerts import AlertManager

__all__ = [
    'GazeTracker',
    'AudioMonitor',
    'WindowMonitor',
    'AlertManager',
]
