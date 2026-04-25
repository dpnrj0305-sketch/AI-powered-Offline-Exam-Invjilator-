import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiLogOut, FiPlus, FiEye, FiAlertTriangle } from 'react-icons/fi';
import '../css/teacher-dashboard.css';

function TeacherDashboard() {
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('my-tests'); // 'my-tests' or 'create'
  const [selectedTest, setSelectedTest] = useState(null);
  const [testAttempts, setTestAttempts] = useState([]);
  const [malpracticeSummary, setMalpracticeSummary] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'details'
  
  const [newTest, setNewTest] = useState({
    test_name: '',
    description: '',
    duration_minutes: 60,
    pass_percentage: 40.0
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchMyTests();
  }, []);

  const fetchMyTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/tests/my-tests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTests(response.data.tests || []);
    } catch (err) {
      setError('Failed to fetch your tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestDetails = async (testId) => {
    setLoading(true);
    try {
      const [attemptsRes, summaryRes] = await Promise.all([
        axios.get(`${apiUrl}/tests/${testId}/attempts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiUrl}/tests/${testId}/malpractice-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setTestAttempts(attemptsRes.data.attempts || []);
      setMalpracticeSummary(summaryRes.data.malpractice_summary || []);
      setViewMode('details');
    } catch (err) {
      setError('Failed to fetch test details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${apiUrl}/tests/create`,
        newTest,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewTest({
        test_name: '',
        description: '',
        duration_minutes: 60,
        pass_percentage: 40.0
      });

      // Refresh tests list
      await fetchMyTests();
      setActiveTab('my-tests');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  const handleTestChange = (e) => {
    setNewTest({
      ...newTest,
      [e.target.name]: 
        e.target.name === 'test_name' || e.target.name === 'description'
          ? e.target.value
          : parseFloat(e.target.value)
    });
  };

  return (
    <div className="teacher-dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>👨‍🏫 Teacher Dashboard</h1>
          <div className="user-section">
            <span className="user-name">Welcome, {user?.full_name || 'Teacher'}</span>
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
            className={`tab ${activeTab === 'my-tests' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('my-tests');
              setViewMode('list');
            }}
          >
            My Tests
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <FiPlus /> Create Test
          </button>
        </div>

        {/* MY TESTS TAB */}
        {activeTab === 'my-tests' && (
          <div className="tab-content">
            {viewMode === 'list' ? (
              <>
                <h2>My Tests</h2>
                {loading ? (
                  <div className="loading">Loading tests...</div>
                ) : tests.length === 0 ? (
                  <div className="empty-state">
                    <p>No tests created yet. Create your first test!</p>
                  </div>
                ) : (
                  <div className="tests-grid">
                    {tests.map((test) => (
                      <div key={test.id} className="test-card">
                        <div className="test-card-header">
                          <h3>{test.test_name}</h3>
                          <span className="test-id">ID: {test.id}</span>
                        </div>
                        <p className="test-description">{test.description || 'No description'}</p>
                        <div className="test-meta">
                          <span>⏱️ {test.duration_minutes} minutes</span>
                          <span>📊 Pass: {test.pass_percentage}%</span>
                        </div>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedTest(test);
                            fetchTestDetails(test.id);
                          }}
                        >
                          <FiEye /> View Results
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  className="btn btn-back"
                  onClick={() => setViewMode('list')}
                >
                  ← Back to Tests
                </button>

                {selectedTest && (
                  <div className="test-details">
                    <h2>{selectedTest.test_name}</h2>
                    
                    {/* ATTEMPTS SECTION */}
                    <div className="section">
                      <h3>📋 Student Attempts ({testAttempts.length})</h3>
                      {testAttempts.length === 0 ? (
                        <p>No attempts yet</p>
                      ) : (
                        <div className="attempts-table-wrapper">
                          <table className="attempts-table">
                            <thead>
                              <tr>
                                <th>Student Name</th>
                                <th>Username</th>
                                <th>Start Time</th>
                                <th>Status</th>
                                <th>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {testAttempts.map((attempt) => (
                                <tr key={attempt.id}>
                                  <td>{attempt.full_name}</td>
                                  <td>{attempt.username}</td>
                                  <td>{new Date(attempt.start_time).toLocaleString()}</td>
                                  <td>
                                    <span className={`status status-${attempt.status}`}>
                                      {attempt.status}
                                    </span>
                                  </td>
                                  <td>{attempt.score.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* MALPRACTICE SUMMARY */}
                    <div className="section">
                      <h3>
                        <FiAlertTriangle /> Malpractice Summary ({malpracticeSummary.length})
                      </h3>
                      {malpracticeSummary.length === 0 ? (
                        <p>No malpractice incidents detected</p>
                      ) : (
                        <div className="malpractice-grid">
                          {malpracticeSummary.map((record) => (
                            <div key={record.attempt_id} className="malpractice-card">
                              <div className="malpractice-header">
                                <h4>{record.full_name}</h4>
                                <span className={`badge ${record.high_severity > 0 ? 'badge-danger' : 'badge-warning'}`}>
                                  {record.total_alerts} alerts
                                </span>
                              </div>
                              <p className="malpractice-username">@{record.username}</p>
                              <div className="alert-breakdown">
                                {record.high_severity > 0 && (
                                  <span className="alert-high">🔴 High: {record.high_severity}</span>
                                )}
                                {record.medium_severity > 0 && (
                                  <span className="alert-medium">🟡 Medium: {record.medium_severity}</span>
                                )}
                              </div>
                              {record.alert_types && (
                                <p className="alert-types">Types: {record.alert_types}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* CREATE TEST TAB */}
        {activeTab === 'create' && (
          <div className="tab-content">
            <h2>Create New Test</h2>
            <form onSubmit={handleCreateTest} className="create-test-form">
              <div className="form-group">
                <label>Test Name *</label>
                <input
                  type="text"
                  name="test_name"
                  placeholder="e.g., Mathematics Final Exam"
                  value={newTest.test_name}
                  onChange={handleTestChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Describe what this test covers..."
                  value={newTest.description}
                  onChange={handleTestChange}
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={newTest.duration_minutes}
                    onChange={handleTestChange}
                    min="1"
                    max="480"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pass Percentage *</label>
                  <input
                    type="number"
                    name="pass_percentage"
                    value={newTest.pass_percentage}
                    onChange={handleTestChange}
                    min="0"
                    max="100"
                    step="0.5"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Test'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default TeacherDashboard;
