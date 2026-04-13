import { useState, useEffect } from 'react';
import axios from 'axios';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const PlotFactory = createPlotlyComponent.default || createPlotlyComponent;
const Plot = PlotFactory(Plotly);
import { DownloadCloud, LayoutDashboard, DatabaseZap, GraduationCap, TestTube } from 'lucide-react';
import StudentProfile from './StudentProfile';

const API_URL = 'http://localhost:8000/api';

export default function Dashboard({ onReset }) {
  const [activeTab, setActiveTab] = useState('metrics');
  const [dashboardData, setDashboardData] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchRoster();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard`);
      setDashboardData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await axios.get(`${API_URL}/roster`);
      setRosterData(res.data.roster);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleStudentSelect = (id) => {
    setSelectedStudent(id);
    setActiveTab('reports');
  };

  if (loading || !dashboardData || !rosterData) {
    return <div className="app-container" style={{alignItems: 'center', justifyContent: 'center'}}><h2>Loading Dashboard...</h2></div>;
  }

  const { metrics, summary, target_distribution } = dashboardData;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-title">
          <div className="icon">🎓</div>
          <h2>Analytics Engine</h2>
          <p>Session Active</p>
        </div>
        <div className="divider"></div>
        
        <div>
          <h4 style={{margin: '0 0 10px 0', color: '#e2e8f0'}}>Overview</h4>
          <p style={{margin: '5px 0'}}><strong>Total Students:</strong> {summary.total.toLocaleString()}</p>
          <p style={{margin: '5px 0'}}><strong>At Risk:</strong> {summary.risk_count.toLocaleString()} ({summary.risk_percentage}%)</p>
        </div>

        <div className="divider"></div>
        <div>
          <h4 style={{margin: '0 0 10px 0', color: '#e2e8f0'}}>⭐ Top 3 Key Factors</h4>
          <ol style={{paddingLeft: '20px', margin: 0, color: '#c4b5fd', fontSize: '0.9rem'}}>
            {Object.entries(metrics.importances).slice(0,3).map(([key, val], i) => (
              <li key={key} style={{marginBottom: '5px'}}>{key} ({(val).toFixed(2)})</li>
            ))}
          </ol>
        </div>

        <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <button className="btn" onClick={onReset} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            <DatabaseZap size={18}/> Start New Analysis
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <h1 className="main-title">🎓 AI Learning Analytics Platform</h1>
        <p className="main-subtitle" style={{marginBottom: '2rem'}}>Predicting Student Risk · Personalised Interventions · Explainable AI</p>

        {/* Tab Navigation */}
        <div className="tab-list">
          <button className={`tab ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>
             📊 EDA & Metrics
          </button>
          <button className={`tab ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
             🏫 Class Roster
          </button>
          <button className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
             🧑‍🎓 Student Reports
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'metrics' && (
          <div>
            <div className="section-header">📈 Data & Model Diagnostics</div>
            <div className="metric-grid">
              <div className="metric-card"><div className="metric-value">{(metrics.accuracy*100).toFixed(1)}%</div><div className="metric-label">Holdout Accuracy</div></div>
              <div className="metric-card"><div className="metric-value">{(metrics.precision*100).toFixed(1)}%</div><div className="metric-label">Precision</div></div>
              <div className="metric-card"><div className="metric-value">{(metrics.recall*100).toFixed(1)}%</div><div className="metric-label">Recall</div></div>
              <div className="metric-card"><div className="metric-value">{(metrics.f1*100).toFixed(1)}%</div><div className="metric-label">F1 Score</div></div>
            </div>

            <div style={{display: 'flex', gap: '2rem'}}>
               <div className="glass-card" style={{flex: 1}}>
                  <h3 style={{marginTop: 0}}>ROC Curve</h3>
                  <Plot 
                     data={[
                        {x: metrics.roc.fpr, y: metrics.roc.tpr, type: 'scatter', mode: 'lines', line: {color: '#7c3aed', width: 3}, name: `AUC: ${metrics.roc.auc.toFixed(3)}` },
                        {x: [0,1], y: [0,1], type: 'scatter', mode: 'lines', line: {color: '#94a3b8', dash: 'dash'}, name: 'Random'}
                     ]}
                     layout={{paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: {color: '#94a3b8'}, width: 450, height: 350, margin: {l: 40, r: 10, t: 30, b: 40}, xaxis: {gridcolor: '#334155'}, yaxis: {gridcolor: '#334155'}}}
                     config={{displayModeBar: false}}
                  />
               </div>
               <div className="glass-card" style={{flex: 1}}>
                  <h3 style={{marginTop: 0}}>Global Feature Importance</h3>
                  <Plot 
                     data={[{
                        type: 'bar',
                        x: Object.values(metrics.importances).reverse(),
                        y: Object.keys(metrics.importances).reverse(),
                        orientation: 'h',
                        marker: {color: '#3b82f6'}
                     }]}
                     layout={{paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: {color: '#94a3b8'}, width: 450, height: 350, margin: {l: 120, r: 10, t: 30, b: 40}, xaxis: {gridcolor: '#334155'}}}
                     config={{displayModeBar: false}}
                  />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div>
            <div className="section-header">📋 Class Overview</div>
            <p style={{color: '#94a3b8'}}>Click on a student row to automatically load their detailed predictive profile.</p>
            <div className="glass-card" style={{overflowX: 'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Risk %</th>
                    <th>Attendance</th>
                    <th>Quiz Avg</th>
                    <th>Top Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.slice(0, 100).map(r => ( // limiting rendering for speed
                    <tr key={r.student_id} onClick={() => handleStudentSelect(r.student_id)}>
                      <td>#{r.student_id}</td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td><span className={`status-badge ${r.status.includes('High') ? 'status-high' : r.status.includes('Warn') ? 'status-warn' : 'status-safe'}`}>{r.status}</span></td>
                      <td>{r.risk_probability.toFixed(1)}%</td>
                      <td>{r.attendance}%</td>
                      <td>{r.quiz_avg}%</td>
                      <td style={{maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.top_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{textAlign: 'center', color: '#64748b', fontSize: '0.8rem', marginTop: '10px'}}>Showing Top 100 visible rows...</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <StudentProfile studentId={selectedStudent} roster={rosterData} onSelect={setSelectedStudent} />
        )}
      </div>
    </div>
  );
}
