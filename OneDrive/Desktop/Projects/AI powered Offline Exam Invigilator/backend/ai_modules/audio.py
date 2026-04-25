"""
Audio Module: Real-time audio level monitoring and speech detection
Detects abnormal noise levels and speech patterns.
"""
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    print("⚠ PyAudio not available - audio monitoring disabled")
    PYAUDIO_AVAILABLE = False

import numpy as np
from scipy import signal
import threading
import time
from queue import Queue
from ..config import (
    AUDIO_THRESHOLD_DB,
    BACKGROUND_NOISE_THRESHOLD_DB,
    SPEECH_DETECTION_THRESHOLD,
    AUDIO_CHECK_INTERVAL,
)

class AudioMonitor:
    """
    Real-time audio monitoring using PyAudio
    Detects noise levels and flags suspicious audio activity
    """

    def __init__(self):
        self.stream = None
        self.audio = None
        
        if not PYAUDIO_AVAILABLE:
            print("⚠ Audio monitoring disabled - install 'pyaudio' for audio features")
            return
        
        self.audio = pyaudio.PyAudio()
        
        # Audio stream settings
        self.CHUNK = 2048
        self.FORMAT = pyaudio.paFloat32
        self.CHANNELS = 1
        self.RATE = 44100
        
        # Initialize stream
        try:
            self.stream = self.audio.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                frames_per_buffer=self.CHUNK,
                input_device_index=0,
            )
        except Exception as e:
            print(f"⚠ Audio initialization error: {e}")
            self.stream = None
            if self.audio:
                self.audio.terminate()
            self.audio = None
        
        # Audio processing state
        self.audio_level = 0
        self.background_noise_baseline = 30
        self.is_processing = False
        self.audio_queue = Queue()
        
    def calculate_db(self, audio_data):
        """Calculate decibel level from audio samples"""
        rms = np.sqrt(np.mean(np.square(audio_data)))
        if rms > 0:
            db = 20 * np.log10(rms)
        else:
            db = -np.inf
        return max(db, 0)  # Ensure non-negative
    
    def detect_speech(self, audio_data):
        """
        Detect speech using frequency domain analysis
        Returns speech confidence score (0-1)
        """
        fft = np.fft.fft(audio_data)
        magnitude = np.abs(fft[:len(fft) // 2])
        
        # Extract frequency bands characteristic of speech (80Hz - 4kHz)
        freq_resolution = self.RATE / len(audio_data)
        lower_freq_idx = int(80 / freq_resolution)
        upper_freq_idx = int(4000 / freq_resolution)
        
        speech_band = magnitude[lower_freq_idx:upper_freq_idx]
        total_energy = np.sum(magnitude)
        
        if total_energy == 0:
            return 0.0
        
        speech_energy_ratio = np.sum(speech_band) / total_energy
        return min(speech_energy_ratio, 1.0)
    
    def detect_human_voice(self, audio_data):
        """
        Detect human voice characteristics
        Returns confidence score (0-1)
        """
        # Convert to frequency domain
        freqs, pxx = signal.periodogram(audio_data, self.RATE)
        
        # Human voice typically 85Hz - 8000Hz
        voice_range = (freqs > 85) & (freqs < 8000)
        voice_energy = np.sum(pxx[voice_range])
        total_energy = np.sum(pxx)
        
        if total_energy == 0:
            return 0.0
        
        confidence = voice_energy / total_energy
        return min(confidence, 1.0)
    
    def monitor_audio(self):
        """
        Continuously monitor audio levels
        Returns: (telemetry, alerts)
        """
        alerts = []
        telemetry = {
            "audio_level_db": 0,
            "noise_detected": False,
            "speech_detected": False,
            "speech_confidence": 0.0,
            "voice_confidence": 0.0,
        }
        
        if not self.stream or not PYAUDIO_AVAILABLE:
            return telemetry, alerts
        
        try:
            # Read audio chunk
            data = self.stream.read(self.CHUNK, exception_on_overflow=False)
            audio_data = np.frombuffer(data, dtype=np.float32)
            
            # Calculate audio level
            db_level = self.calculate_db(audio_data)
            self.audio_level = db_level
            telemetry["audio_level_db"] = round(db_level, 2)
            
            # Detect speech
            speech_confidence = self.detect_speech(audio_data)
            voice_confidence = self.detect_human_voice(audio_data)
            
            telemetry["speech_confidence"] = round(speech_confidence, 2)
            telemetry["voice_confidence"] = round(voice_confidence, 2)
            
            # Check for excessive noise
            if db_level > AUDIO_THRESHOLD_DB:
                telemetry["noise_detected"] = True
                alerts.append({
                    "type": "AUDIO_NOISE_ALERT",
                    "severity": "MEDIUM",
                    "message": f"Excessive noise detected: {db_level:.1f}dB (threshold: {AUDIO_THRESHOLD_DB}dB)",
                    "timestamp": time.time(),
                    "db_level": db_level,
                })
            
            # Check for speech
            if voice_confidence > SPEECH_DETECTION_THRESHOLD:
                telemetry["speech_detected"] = True
                alerts.append({
                    "type": "SPEECH_DETECTED",
                    "severity": "HIGH",
                    "message": f"Speech detected with {voice_confidence*100:.1f}% confidence",
                    "timestamp": time.time(),
                    "confidence": voice_confidence,
                })
            
            self.audio_queue.put({
                "timestamp": time.time(),
                "level_db": db_level,
                "speech_confidence": speech_confidence,
                "voice_confidence": voice_confidence,
            })
            
        except Exception as e:
            print(f"⚠ Audio monitoring error: {e}")
        
        return telemetry, alerts
    
    def get_audio_history(self, duration=10):
        """Get audio level history for the last N seconds"""
        history = []
        current_time = time.time()
        
        while not self.audio_queue.empty():
            item = self.audio_queue.get()
            if current_time - item["timestamp"] < duration:
                history.append(item)
        
        return history
    
    def stop(self):
        """Stop audio stream"""
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        if self.audio:
            self.audio.terminate()
