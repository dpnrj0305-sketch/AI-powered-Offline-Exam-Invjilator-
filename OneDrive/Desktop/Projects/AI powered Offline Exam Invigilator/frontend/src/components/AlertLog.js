import React from 'react';
import { FiX } from 'react-icons/fi';

function AlertLog({ alerts, summary, onClear }) {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      GAZE_ALERT: '👁️ Gaze Alert',
      AUDIO_NOISE_ALERT: '📢 Noise Alert',
      SPEECH_DETECTED: '🎤 Speech Detected',
      WINDOW_FOCUS_LOST: '🪟 Window Lost',
      SUSPICIOUS_PROCESS: '⚠️ Suspicious Process',
    };
    return labels[type] || type;
  };

  const formatTimeDifference = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    return `${Math.round(seconds / 3600)}h ago`;
  };

  const activeAlerts = alerts || [];
  const totalAlerts = summary?.total_alerts_ever || 0;
  const alertCounts = summary?.counts_by_type || {};
  const highPriorityCount = summary?.high_priority_count || 0;

  return (
    <div className="alert-log-container">
      {/* Alert Summary Stats */}
      <div className="alert-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Alerts</span>
          <span className="stat-value">{totalAlerts}</span>
        </div>
        <div className="summary-stat alert">
          <span className="stat-label">High Priority</span>
          <span className="stat-value">{highPriorityCount}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Active</span>
          <span className="stat-value">{activeAlerts.length}</span>
        </div>
      </div>

      {/* Alert Count Breakdown */}
      <div className="alert-breakdown">
        {Object.entries(alertCounts).map(([type, count]) => (
          <div key={type} className="breakdown-item">
            <span className="breakdown-label">{type}</span>
            <span className="breakdown-count">{count}</span>
          </div>
        ))}
      </div>

      {/* Alert Log */}
      <div className="alert-log">
        <div className="alert-log-header">
          <h3>🚨 Live Alert Log</h3>
          {activeAlerts.length > 0 && (
            <button className="btn-clear-small" onClick={onClear}>
              <FiX /> Clear
            </button>
          )}
        </div>

        <div className="alert-list">
          {activeAlerts.length === 0 ? (
            <div className="no-alerts">
              <p>✓ No active alerts</p>
              <small>Student behavior is normal</small>
            </div>
          ) : (
            activeAlerts.map((alert, index) => (
              <div
                key={alert.id || index}
                className={`alert-item alert-${alert.severity.toLowerCase()}`}
              >
                <div className="alert-icon">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="alert-content">
                  <div className="alert-type">
                    {getAlertTypeLabel(alert.type)}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">
                    {formatTimeDifference(
                      (Date.now() - alert.timestamp * 1000) / 1000
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats - Alert Rate */}
      {summary && (
        <div className="alert-rate">
          <span className="rate-label">Alert Rate</span>
          <span className="rate-value">
            {(summary.alert_rate || 0).toFixed(2)}/min
          </span>
        </div>
      )}
    </div>
  );
}

export default AlertLog;
