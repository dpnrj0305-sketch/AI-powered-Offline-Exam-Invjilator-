import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function Dashboard({ telemetry, alerts }) {
  // Prepare data for charts
  const focusScore = telemetry.focus_score || 0;
  const audioLevel = telemetry.audio?.audio_level_db || 0;
  const visionData = telemetry.vision || {};
  const audioData = telemetry.audio || {};
  const windowData = telemetry.window || {};

  // Alert distribution by type
  const alertTypes = {
    'Gaze Alerts': 0,
    'Audio Alerts': 0,
    'Window Alerts': 0,
    'Suspicious': 0,
  };

  alerts.forEach((alert) => {
    if (alert.type === 'GAZE_ALERT') alertTypes['Gaze Alerts']++;
    else if (alert.type.includes('AUDIO')) alertTypes['Audio Alerts']++;
    else if (alert.type === 'WINDOW_FOCUS_LOST') alertTypes['Window Alerts']++;
    else alertTypes['Suspicious']++;
  });

  const alertDistributionData = Object.entries(alertTypes).map(([name, value]) => ({
    name,
    value,
  }));

  // Performance metrics for radar chart
  const performanceData = [
    {
      category: 'Focus',
      value: Math.min(100, focusScore),
      fullMark: 100,
    },
    {
      category: 'Audio',
      value: Math.max(0, 100 - audioLevel),
      fullMark: 100,
    },
    {
      category: 'Window',
      value: windowData.exam_window_active ? 100 : 20,
      fullMark: 100,
    },
    {
      category: 'Face',
      value: visionData.face_detected ? 100 : 20,
      fullMark: 100,
    },
    {
      category: 'Stability',
      value: Math.min(100, 100 - (alerts.length * 10)),
      fullMark: 100,
    },
  ];

  return (
    <div className="dashboard">
      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-box">
          <h4>📊 Focus Score</h4>
          <div className="metric-large">
            {Math.round(focusScore)}%
          </div>
          <p className="metric-small">
            {focusScore >= 80 ? 'Excellent' : focusScore >= 50 ? 'Good' : 'Poor'}
          </p>
        </div>

        <div className="metric-box">
          <h4>📢 Audio Level</h4>
          <div className="metric-large">
            {audioLevel.toFixed(1)} dB
          </div>
          <p className="metric-small">
            {audioData.noise_detected ? 'High' : 'Normal'}
          </p>
        </div>

        <div className="metric-box">
          <h4>👁️ Gaze Direction</h4>
          <div className="metric-large">
            {visionData.gaze_direction || 'N/A'}
          </div>
          <p className="metric-small">
            {visionData.face_detected ? 'Face Detected' : 'No Face'}
          </p>
        </div>

        <div className="metric-box">
          <h4>🚨 Active Alerts</h4>
          <div className="metric-large" style={{ color: alerts.length > 5 ? '#ef4444' : '#10b981' }}>
            {alerts.length}
          </div>
          <p className="metric-small">
            {alerts.length > 5 ? 'High Activity' : 'Normal'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-container">
        {/* Performance Radar Chart */}
        <div className="chart-box">
          <h4>🎯 Performance Radar</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={performanceData}>
              <PolarGrid stroke="#444" />
              <PolarAngleAxis dataKey="category" stroke="#aaa" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Distribution Chart */}
        <div className="chart-box">
          <h4>📊 Alert Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertDistributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Panel */}
      <div className="status-panel">
        <div className="status-item">
          <span className="status-label">Face Detection</span>
          <span className={`status-badge ${visionData.face_detected ? 'active' : 'inactive'}`}>
            {visionData.face_detected ? '✓ Active' : '✗ Inactive'}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Gaze Tracking</span>
          <span className={`status-badge ${visionData.gaze_direction === 'CENTER' ? 'active' : 'warning'}`}>
            {visionData.gaze_direction === 'CENTER' ? '✓ Centered' : `⚠ ${visionData.gaze_direction || 'N/A'}`}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Audio Monitor</span>
          <span className={`status-badge ${!audioData.noise_detected && !audioData.speech_detected ? 'active' : 'warning'}`}>
            {!audioData.noise_detected && !audioData.speech_detected ? '✓ Clean' : '⚠ Alert'}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Window Focus</span>
          <span className={`status-badge ${windowData.exam_window_active ? 'active' : 'alert'}`}>
            {windowData.exam_window_active ? '✓ Focused' : '✗ Lost'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
