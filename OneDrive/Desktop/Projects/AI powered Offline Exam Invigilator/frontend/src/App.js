import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './css/styles.css';
import './css/auth.css';
import './css/teacher-dashboard.css';
import './css/student-dashboard.css';

// Authentication
import Login from './components/Login';

// Dashboards
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';

// Monitoring (Pro Mode)
import Dashboard from './components/Dashboard';
import VideoFeed from './components/VideoFeed';
import TelemetrySidebar from './components/TelemetrySidebar';
import AlertLog from './components/AlertLog';
import { FiPower, FiRefreshCw, FiTrash2 } from 'react-icons/fi';

const API_URL = 'http://localhost:8000';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Exam Monitoring Pro Mode Component
function ProMonitoring() {
  const [monitoring, setMonitoring] = useState(false);
  const [telemetry, setTelemetry] = useState({
    vision: {},
    audio: {},
    window: {},
    focus_score: 100,
    timestamp: Date.now(),
  });
  const [alerts, setAlerts] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [systemHealth, setSystemHealth] = useState('unknown');
  const websocketTelemetry = useRef(null);
  const websocketAlerts = useRef(null);

  // Check system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        setSystemHealth(data.status);
        setMonitoring(data.monitoring);
      } catch (error) {
        setSystemHealth('error');
        console.error('Health check failed:', error);
      }
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 5000);
    return () => clearInterval(healthInterval);
  }, []);

  // WebSocket for real-time telemetry
  useEffect(() => {
    connectWebsocketTelemetry();
    return () => {
      if (websocketTelemetry.current) {
        websocketTelemetry.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWebsocketTelemetry = () => {
    try {
      websocketTelemetry.current = new WebSocket(
        'ws://localhost:8000/ws/telemetry'
      );

      websocketTelemetry.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setTelemetry(data);
      };

      websocketTelemetry.current.onerror = (error) => {
        console.error('Telemetry WebSocket error:', error);
      };

      websocketTelemetry.current.onclose = () => {
        setTimeout(connectWebsocketTelemetry, 3000);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // WebSocket for real-time alerts
  useEffect(() => {
    connectWebsocketAlerts();
    return () => {
      if (websocketAlerts.current) {
        websocketAlerts.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWebsocketAlerts = () => {
    try {
      websocketAlerts.current = new WebSocket(
        'ws://localhost:8000/ws/alerts'
      );

      websocketAlerts.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setAlerts(data.alerts || []);
        setAlertsSummary(data.summary || null);
      };

      websocketAlerts.current.onerror = (error) => {
        console.error('Alerts WebSocket error:', error);
      };

      websocketAlerts.current.onclose = () => {
        setTimeout(connectWebsocketAlerts, 3000);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // Control monitoring
  const handleStartMonitoring = async () => {
    try {
      const response = await fetch(`${API_URL}/monitoring/start`, {
        method: 'POST',
      });
      const data = await response.json();
      setMonitoring(data.monitoring);
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const response = await fetch(`${API_URL}/monitoring/stop`, {
        method: 'POST',
      });
      const data = await response.json();
      setMonitoring(data.monitoring);
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  };

  const handleClearAlerts = async () => {
    try {
      await fetch(`${API_URL}/alerts/clear`, {
        method: 'POST',
      });
      setAlerts([]);
    } catch (error) {
      console.error('Error clearing alerts:', error);
    }
  };

  return (
    <div className="app pro-mode-dark">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>🔐 Exam Invigilator Pro</h1>
          <span className={`system-status ${systemHealth}`}>
            {systemHealth === 'healthy' ? '● Online' : '● Offline'}
          </span>
        </div>

        <div className="header-controls">
          <button
            className={`btn-control ${monitoring ? 'active' : ''}`}
            onClick={monitoring ? handleStopMonitoring : handleStartMonitoring}
            title={monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          >
            <FiPower /> {monitoring ? 'Monitoring Active' : 'Start Monitoring'}
          </button>

          <button
            className="btn-control secondary"
            onClick={handleClearAlerts}
            title="Clear Alerts"
          >
            <FiTrash2 /> Clear
          </button>

          <button
            className="btn-control secondary"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-container">
        {/* Video Feed Section */}
        <div className="main-content">
          <div className="video-section">
            <h2>📹 Live Student Feed</h2>
            <VideoFeed apiUrl={API_URL} monitoring={monitoring} />
          </div>

          {/* Dashboard Section */}
          <div className="dashboard-section">
            <h2>📊 Real-Time Analytics</h2>
            <Dashboard telemetry={telemetry} alerts={alerts} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="sidebar">
          {/* Telemetry Sidebar */}
          <TelemetrySidebar telemetry={telemetry} monitoring={monitoring} />

          {/* Alert Log */}
          <AlertLog
            alerts={alerts}
            summary={alertsSummary}
            onClear={handleClearAlerts}
          />
        </aside>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <span>AI-Powered Exam Invigilator v1.0.0</span>
        <span>Last Updated: {new Date(telemetry.timestamp).toLocaleTimeString()}</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Pro Monitoring Mode */}
        <Route path="/pro-monitoring" element={<ProMonitoring />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
