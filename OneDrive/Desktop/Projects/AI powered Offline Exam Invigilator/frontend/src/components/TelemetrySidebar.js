import React from 'react';
import { FiEye, FiVolume2, FiMonitor, FiTrendingUp } from 'react-icons/fi';

function TelemetrySidebar({ telemetry, monitoring }) {
  const focusScore = telemetry.focus_score || 0;
  const visionData = telemetry.vision || {};
  const audioData = telemetry.audio || {};
  const windowData = telemetry.window || {};

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getGazeIcon = (direction) => {
    const icons = {
      'CENTER': '👁️',
      'LEFT': '👈',
      'RIGHT': '👉',
      'UP': '👀',
      'DOWN': '👇',
    };
    return icons[direction] || '❓';
  };

  return (
    <div className="telemetry-sidebar">
      {/* Focus Score - Main Metric */}
      <div className="metric-card focus-score-card">
        <div className="metric-header">
          <FiTrendingUp className="metric-icon" />
          <h3>Focus Score</h3>
        </div>
        <div className="focus-score-display">
          <div
            className="focus-score-circle"
            style={{
              borderColor: getScoreColor(focusScore),
              boxShadow: `0 0 20px ${getScoreColor(focusScore)}`,
            }}
          >
            <span className="focus-score-value">{Math.round(focusScore)}</span>
            <span className="focus-score-unit">%</span>
          </div>
          <p className="focus-score-status">
            {focusScore >= 80
              ? '✓ Excellent Focus'
              : focusScore >= 50
              ? '⚠ Normal Focus'
              : '⚠ Low Focus'}
          </p>
        </div>
      </div>

      {/* Vision Metrics */}
      <div className="metric-card">
        <div className="metric-header">
          <FiEye className="metric-icon" />
          <h3>Vision Analysis</h3>
        </div>
        <div className="metric-content">
          <div className="metric-row">
            <span className="metric-label">Gaze Direction</span>
            <span className="metric-value gaze-indicator">
              {getGazeIcon(visionData.gaze_direction)}
              {visionData.gaze_direction || 'N/A'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Face Detection</span>
            <span
              className={`metric-value status-badge ${
                visionData.face_detected ? 'active' : 'inactive'
              }`}
            >
              {visionData.face_detected ? '✓ Detected' : '✗ Not Detected'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Look Away Duration</span>
            <span className="metric-value">
              {(visionData.looking_away_duration || 0).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Audio Metrics */}
      <div className="metric-card">
        <div className="metric-header">
          <FiVolume2 className="metric-icon" />
          <h3>Audio Analysis</h3>
        </div>
        <div className="metric-content">
          <div className="metric-row">
            <span className="metric-label">Noise Level</span>
            <span className="metric-value">
              {(audioData.audio_level_db || 0).toFixed(1)} dB
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Status</span>
            <span
              className={`metric-value status-badge ${
                audioData.noise_detected ? 'alert' : 'normal'
              }`}
            >
              {audioData.noise_detected ? '⚠ High Noise' : '✓ Normal'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Speech Detected</span>
            <span
              className={`metric-value status-badge ${
                audioData.speech_detected ? 'alert' : 'normal'
              }`}
            >
              {audioData.speech_detected ? '🎤 Yes' : '✓ No'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Confidence</span>
            <span className="metric-value">
              {(audioData.voice_confidence || 0) * 100 | 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Window Monitoring */}
      <div className="metric-card">
        <div className="metric-header">
          <FiMonitor className="metric-icon"/>
          <h3>Window Monitor</h3>
        </div>
        <div className="metric-content">
          <div className="metric-row">
            <span className="metric-label">Exam Window</span>
            <span
              className={`metric-value status-badge ${
                windowData.exam_window_active ? 'active' : 'alert'
              }`}
            >
              {windowData.exam_window_active ? '✓ Focused' : '⚠ Unfocused'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Current Window</span>
            <span className="metric-value window-title">
              {(windowData.active_window_title || 'Unknown').substring(0, 20)}
              {(windowData.active_window_title || '').length > 20 ? '...' : ''}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Lost Focus Time</span>
            <span className="metric-value">
              {(windowData.time_since_focus_lost || 0).toFixed(1)}s
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Suspicious Apps</span>
            <span className="metric-value">
              {(windowData.suspicious_processes || []).length}
            </span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="monitoring-status">
        <span className={`status-dot ${monitoring ? 'active' : 'inactive'}`}></span>
        <span>{monitoring ? 'Monitoring Active' : 'Monitoring Inactive'}</span>
      </div>
    </div>
  );
}

export default TelemetrySidebar;
