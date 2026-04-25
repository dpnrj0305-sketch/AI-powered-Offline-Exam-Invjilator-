import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiLogOut, FiPlay, FiCheckCircle, FiClock } from 'react-icons/fi';
import '../css/student-dashboard.css';

function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'my-results'
  const [takingTest, setTakingTest] = useState(null);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [testStartTime, setTestStartTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchAvailableTests();
    fetchMyAttempts();
  }, []);

  // Timer for test elapsed time
  useEffect(() => {
    if (!attemptStarted || !takingTest) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
      setTimeElapsed(elapsed);

      // Check if time exceeded
      if (elapsed > takingTest.duration_minutes * 60) {
        handleFinishTest();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptStarted, testStartTime]);

  // WebSocket for real-time telemetry during exam
  useEffect(() => {
    if (!attemptStarted || !takingTest) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(
        `${protocol}//${window.location.host.replace('3000', '8000')}/ws/telemetry`
      );

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setTelemetry(data);
      };

      ws.onerror = () => {
        console.log('WebSocket error');
      };

      return ws;
    };

    const ws = connectWebSocket();
    return () => ws && ws.close();
  }, [attemptStarted, takingTest]);

  const fetchAvailableTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/tests`);
      setTests(response.data.tests || []);
    } catch (err) {
      setError('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttempts = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/student/my-attempts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyAttempts(response.data.attempts || []);
    } catch (err) {
      console.log('Failed to fetch attempts');
    }
  };

  const handleStartTest = async (test) => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${apiUrl}/tests/${test.id}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTakingTest({
        ...test,
        attempt_id: response.data.attempt.id
      });
      setAttemptStarted(true);
      setTestStartTime(Date.now());
      setTimeElapsed(0);
      setAlerts([]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTest = async () => {
    if (!takingTest) return;

    setLoading(true);

    try {
      await axios.post(
        `${apiUrl}/tests/attempts/${takingTest.attempt_id}/finish`,
        { score: 0 }, // In a real scenario, calculate score based on answers
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAttemptStarted(false);
      setTakingTest(null);
      setError('');

      // Refresh attempts
      await fetchMyAttempts();
      setActiveTab('my-results');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit test');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  // If taking test, show exam interface
  if (attemptStarted && takingTest) {
    const timeLimit = takingTest.duration_minutes * 60;
    const timeRemaining = timeLimit - timeElapsed;
    const isTimeRunningOut = timeRemaining < 300; // Last 5 minutes

    return (
      <div className="exam-interface">
        <div className="exam-header">
          <h2>{takingTest.test_name}</h2>
          <div className="timer-section">
            <span className={`timer ${isTimeRunningOut ? 'warning' : ''}`}>
              <FiClock /> {formatTime(timeRemaining)}
            </span>
            <button
              className="btn btn-submit"
              onClick={handleFinishTest}
              disabled={loading}
            >
              Submit Exam
            </button>
          </div>
        </div>

        <div className="exam-content">
          <div className="exam-main">
            <div className="video-container">
              <img
                src={`${apiUrl}/video-stream`}
                alt="Exam Monitoring"
                className="exam-video"
              />
            </div>

            <div className="exam-instructions">
              <h3>📋 Test Instructions</h3>
              <ul>
                <li>You have {takingTest.duration_minutes} minutes to complete this test</li>
                <li>Your webcam is being monitored for security</li>
                <li>Any suspicious activity will be recorded</li>
                <li>Do not switch tabs or windows</li>
                <li>Keep your face visible to the camera at all times</li>
              </ul>
              <p className="note">
                ⚠️ This test is proctored. All activities are being monitored and recorded.
              </p>
            </div>
          </div>

          {/* MONITORING TELEMETRY SIDEBAR */}
          <div className="exam-sidebar">
            <div className="telemetry-card">
              <h4>Live Monitoring</h4>
              {telemetry ? (
                <div className="telemetry-data">
                  <div className="telemetry-item">
                    <span>Face Detection</span>
                    <span className={`status ${telemetry.vision?.face_detected ? 'good' : 'warning'}`}>
                      {telemetry.vision?.face_detected ? '✓' : '⚠'}
                    </span>
                  </div>
                  <div className="telemetry-item">
                    <span>Gaze Direction</span>
                    <span className="value">{telemetry.vision?.gaze_direction || 'N/A'}</span>
                  </div>
                  <div className="telemetry-item">
                    <span>Audio Level</span>
                    <span className="value">
                      {telemetry.audio?.noise_level_db ? telemetry.audio.noise_level_db.toFixed(1) : '0'}dB
                    </span>
                  </div>
                  <div className="telemetry-item">
                    <span>Window Focus</span>
                    <span className={`status ${telemetry.window?.exam_window_active ? 'good' : 'warning'}`}>
                      {telemetry.window?.exam_window_active ? '✓' : '⚠'}
                    </span>
                  </div>
                  <div className="telemetry-item">
                    <span>Focus Score</span>
                    <span className="value">{telemetry.focus_score?.toFixed(0) || '0'}%</span>
                  </div>
                </div>
              ) : (
                <p className="loading-text">Initializing monitoring...</p>
              )}
            </div>

            <div className="alerts-card">
              <h4>Alerts ({alerts.length})</h4>
              {alerts.length === 0 ? (
                <p className="no-alerts">No alerts yet. Keep it up! ✓</p>
              ) : (
                <div className="alerts-list">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className={`alert-item severity-${alert.severity?.toLowerCase()}`}>
                      <span>{alert.type}</span>
                      <small>{alert.message}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📚 Student Dashboard</h1>
          <div className="user-section">
            <span className="user-name">Welcome, {user?.full_name || 'Student'}</span>
            <button className="btn-logout" onClick={handleLogout}>
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        {error && <div className="alert alert-error">{error}</div>}

        {/* TABS */}
        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            <FiPlay /> Available Tests
          </button>
          <button
            className={`tab ${activeTab === 'my-results' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-results')}
          >
            <FiCheckCircle /> My Results
          </button>
        </div>

        {/* AVAILABLE TESTS TAB */}
        {activeTab === 'available' && (
          <div className="tab-content">
            <h2>Available Tests</h2>
            {loading ? (
              <div className="loading">Loading tests...</div>
            ) : tests.length === 0 ? (
              <div className="empty-state">
                <p>No tests available right now. Check back soon!</p>
              </div>
            ) : (
              <div className="tests-grid">
                {tests.map((test) => {
                  const alreadyTaken = myAttempts.some(
                    (attempt) => attempt.test_id === test.id && attempt.status === 'completed'
                  );

                  return (
                    <div key={test.id} className="test-card">
                      <div className="test-card-header">
                        <h3>{test.test_name}</h3>
                        {alreadyTaken && <span className="badge-taken">✓ Taken</span>}
                      </div>
                      <p className="test-description">{test.description || 'No description'}</p>
                      <div className="test-meta">
                        <span>⏱️ {test.duration_minutes} minutes</span>
                        <span>📊 Pass: {test.pass_percentage}%</span>
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStartTest(test)}
                        disabled={alreadyTaken || loading}
                      >
                        <FiPlay /> {alreadyTaken ? 'Already Taken' : 'Start Test'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MY RESULTS TAB */}
        {activeTab === 'my-results' && (
          <div className="tab-content">
            <h2>My Test Results</h2>
            {myAttempts.length === 0 ? (
              <div className="empty-state">
                <p>You haven't taken any tests yet. Start a test from the "Available Tests" tab!</p>
              </div>
            ) : (
              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Start Time</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAttempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td className="test-name-col">
                          {tests.find((t) => t.id === attempt.test_id)?.test_name || 'Test'}
                        </td>
                        <td>{new Date(attempt.start_time).toLocaleString()}</td>
                        <td>
                          <span className={`status status-${attempt.status}`}>
                            {attempt.status}
                          </span>
                        </td>
                        <td className="score-col">
                          {attempt.status === 'completed' ? (
                            <span className="score">{attempt.score?.toFixed(2) || '0'}%</span>
                          ) : (
                            <span className="score-pending">In Progress</span>
                          )}
                        </td>
                        <td>
                          <button className="btn-view-details">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;
