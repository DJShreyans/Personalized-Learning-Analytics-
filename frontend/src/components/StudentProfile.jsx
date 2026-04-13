import { useState, useEffect } from 'react';
import axios from 'axios';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const PlotFactory = createPlotlyComponent.default || createPlotlyComponent;
const Plot = PlotFactory(Plotly);

const API_URL = 'http://localhost:8000/api';

export default function StudentProfile({ studentId, roster, onSelect }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fallback to first student if none selected
  const activeStudentId = studentId || (roster && roster.length > 0 ? roster[0].student_id : null);

  useEffect(() => {
    if (activeStudentId) {
      fetchStudent(activeStudentId);
    }
  }, [activeStudentId]);

  const fetchStudent = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/student/${id}`);
      setProfileData(res.data);
    } catch (e) {
      setError('Failed to load profile.');
      console.error(e);
    }
    setLoading(false);
  };

  if (!activeStudentId) {
    return <div>No students available.</div>;
  }

  return (
    <div>
      <div className="section-header">🧑‍🎓 Student Analytics Dashboard</div>
      
      <div style={{marginBottom: '2rem'}}>
        <span style={{color: '#94a3b8', marginRight: '10px'}}>Search & select a student:</span>
        <select 
          value={activeStudentId} 
          onChange={(e) => onSelect(parseInt(e.target.value))}
          style={{padding: '0.5rem', borderRadius: '8px', background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--primary)', minWidth: '300px'}}
        >
          {roster.map(r => (
            <option key={r.student_id} value={r.student_id}>
              #{r.student_id} — {r.first_name} {r.last_name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading student analytics...</p>}
      {error && <p style={{color: '#ef4444'}}>{error}</p>}
      
      {profileData && !loading && (
        <div style={{display: 'flex', gap: '2rem'}}>
          {/* Left Column */}
          <div style={{flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div className="profile-card">
              <div className="profile-avatar">{profileData.profile.first_name[0]}{profileData.profile.last_name[0]}</div>
              <h2 style={{margin: '0', color: 'white'}}>{profileData.profile.first_name} {profileData.profile.last_name}</h2>
              <p style={{color: '#94a3b8', margin: '5px 0'}}>{profileData.profile.course_enrolled} | {profileData.profile.learning_style}</p>
            </div>
            
            <div className="glass-card" style={{textAlign: 'center'}}>
              <Plot 
                 data={[{
                   type: 'indicator',
                   mode: 'gauge+number',
                   value: profileData.risk_probability,
                   number: { suffix: "%", font: { color: profileData.risk_probability > 50 ? "#f43f5e" : "#10b981" } },
                   title: { text: "Dropout Risk", font: { color: "#94a3b8" } },
                   gauge: {
                     axis: { range: [0, 100] },
                     bar: { color: profileData.risk_probability > 50 ? "#f43f5e" : "#10b981" },
                     bgcolor: "rgba(25,25,60,0.3)",
                     borderwidth: 0,
                     steps: [
                       { range: [0, 30], color: "rgba(16,185,129,0.1)" },
                       { range: [30, 60], color: "rgba(245,158,11,0.1)" },
                       { range: [60, 100], color: "rgba(244,63,94,0.1)" }
                     ]
                   }
                 }]}
                 layout={{paper_bgcolor: 'transparent', font: {color: '#94a3b8', family: 'Inter'}, width: 280, height: 250, margin: {l: 30, r: 30, t: 30, b: 10}}}
                 config={{displayModeBar: false}}
              />
            </div>
          </div>

          {/* Right Column */}
          <div style={{flex: '2'}}>
            <div className="section-header">✅ Priority Intervention Checklist</div>
            <div style={{marginBottom: '2rem'}}>
              {profileData.recommendations.map((rec, i) => (
                <div key={i} className="rec-card">
                  <span style={{fontSize: '1.5rem'}}>{rec.icon}</span>
                  <span style={{color: '#e2e8f0', lineHeight: '1.6'}}>{rec.text}</span>
                </div>
              ))}
            </div>

            <div style={{display: 'flex', gap: '1rem'}}>
              <div className="glass-card" style={{flex: 1}}>
                <div className="section-header">📊 Versus Class Avg</div>
                <Plot 
                  data={[
                    {
                      type: 'scatterpolar',
                      r: Object.values(profileData.radar.average).concat([Object.values(profileData.radar.average)[0]]),
                      theta: Object.keys(profileData.radar.average).concat([Object.keys(profileData.radar.average)[0]]),
                      fill: 'toself',
                      name: 'Class Avg',
                      line: {dash: 'dash', color: '#94a3b8'}
                    },
                    {
                      type: 'scatterpolar',
                      r: Object.values(profileData.radar.student).concat([Object.values(profileData.radar.student)[0]]),
                      theta: Object.keys(profileData.radar.student).concat([Object.keys(profileData.radar.student)[0]]),
                      fill: 'toself',
                      name: 'Student',
                      line: {color: '#7c3aed'}
                    }
                  ]}
                  layout={{
                    paper_bgcolor: 'transparent', 
                    polar: {bgcolor: 'transparent', radialaxis: {visible: false}},
                    font: {color: '#94a3b8', size: 10}, 
                    width: 300, height: 280, 
                    margin: {l: 30, r: 30, t: 20, b: 20},
                    showlegend: true, legend: {orientation: 'h', y: -0.1}
                  }}
                  config={{displayModeBar: false}}
                />
              </div>

              <div className="glass-card" style={{flex: 1}}>
                <div className="section-header">🔍 Why? (SHAP)</div>
                <Plot 
                   data={[{
                      type: 'bar',
                      x: profileData.shap.values.slice(0, 5).reverse(), // top 5 for UI space
                      y: profileData.shap.names.slice(0, 5).reverse(),
                      orientation: 'h',
                      marker: {color: profileData.shap.values.slice(0, 5).reverse().map(v => v > 0 ? '#f43f5e' : '#06b6d4')},
                      text: profileData.shap.values.slice(0, 5).reverse().map(v => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)),
                      textposition: 'outside'
                   }]}
                   layout={{paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: {color: '#94a3b8', size: 10}, width: 300, height: 280, margin: {l: 100, r: 40, t: 20, b: 20}, xaxis: {gridcolor: '#334155'}}}
                   config={{displayModeBar: false}}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
