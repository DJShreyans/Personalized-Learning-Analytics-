import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, FileCog, GraduationCap, LayoutDashboard } from 'lucide-react';
import Dashboard from './components/Dashboard';

const API_URL = 'http://localhost:8000/api';

function App() {
  const [appState, setAppState] = useState({ setup_phase: 'LOADING', has_data: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [availableColumns, setAvailableColumns] = useState([]);

  useEffect(() => {
    checkState();
  }, []);

  const checkState = async () => {
    try {
      const res = await axios.get(`${API_URL}/state`);
      setAppState(res.data);
    } catch (e) {
      console.error('API not reachable yet', e);
      setAppState({ setup_phase: 'UPLOAD', has_data: false });
    }
  };

  const fetchColumns = async () => {
    try {
      const res = await axios.get(`${API_URL}/columns`);
      setAvailableColumns(res.data.columns);
      if (res.data.columns.length > 0) {
        setTargetColumn(res.data.columns[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDemo = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`${API_URL}/demo`);
      await checkState();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error loading demo');
    }
    setIsProcessing(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setIsProcessing(true);
    setError('');
    try {
      await axios.post(`${API_URL}/upload`, formData);
      await checkState();
      await fetchColumns();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error uploading file');
    }
    setIsProcessing(false);
  };

  const handleSetup = async (method) => {
    setIsProcessing(true);
    try {
      await axios.post(`${API_URL}/setup`, { method, target_column: targetColumn });
      await checkState();
    } catch (e) {
      setError(e.response?.data?.detail || 'Setup failed');
    }
    setIsProcessing(false);
  };

  if (appState.setup_phase === 'LOADING') {
    return <div className="app-container" style={{alignItems: 'center', justifyContent: 'center'}}><h2>Loading Platform...</h2></div>;
  }

  if (appState.setup_phase === 'READY') {
    return <Dashboard onReset={() => setAppState({setup_phase: 'UPLOAD', has_data: false})} />;
  }

  return (
    <div className="app-container" style={{flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem'}}>
      <div className="main-title-container">
        <h1 className="main-title">🎓 AI Learning Analytics Platform</h1>
        <p className="main-subtitle">Predicting Student Risk · Personalised Interventions · Explainable AI</p>
      </div>

      {error && <div style={{color: '#ef4444', background: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>{error}</div>}

      {appState.setup_phase === 'UPLOAD' && (
        <div className="glass-card" style={{maxWidth: '800px', width: '100%', textAlign: 'center', padding: '4rem'}}>
          <div className="animate-float">📂</div>
          <h2 style={{fontSize: '2rem', marginBottom: '1rem'}}>Initialize Platform</h2>
          <p style={{color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2rem'}}>
            Upload your student dataset (.csv or .xlsx) to initialize the system, dynamically train the Random Forest model, and generate personalized risk analytics.
          </p>

          <label className="uploader-box" style={{display: 'block', marginBottom: '2rem'}}>
            <input type="file" style={{display: 'none'}} accept=".csv,.xlsx" onChange={handleFileUpload} disabled={isProcessing} />
            <UploadCloud size={48} color="#7c3aed" style={{marginBottom: '1rem'}} />
            <h3 style={{margin: 0}}>Click or Drag to Upload</h3>
            <p style={{color: '#94a3b8', margin: '0.5rem 0 0 0'}}>{isProcessing ? 'Processing File...' : 'CSV or XLSX'}</p>
          </label>

          <button className="btn" onClick={handleDemo} disabled={isProcessing}>
            🎲 Load Default Pre-Trained Dataset
          </button>
        </div>
      )}

      {appState.setup_phase === 'NEEDS_TARGET' && (
        <div className="glass-card" style={{maxWidth: '800px', width: '100%', textAlign: 'center', padding: '3rem'}}>
          <h2 style={{color: '#f1f5f9'}}>⚙️ Define Target Criteria</h2>
          <p style={{color: '#94a3b8', marginBottom: '2rem'}}>Your dataset is missing the `final_score` or `at_risk` columns required to train the model. Please choose how to define the target.</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center'}}>
            <div className="glass-card" style={{width: '100%', maxWidth: '500px'}}>
              <h4>Option 1: Default Educational Rule</h4>
              <p style={{fontSize: '0.9rem', color: '#94a3b8'}}>Calculates standard weighted average (Quiz + Attendance + Assignments).</p>
              <button className="btn primary" onClick={() => handleSetup('default')} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Use Default Rule'}
              </button>
            </div>

            <div className="glass-card" style={{width: '100%', maxWidth: '500px'}}>
              <h4>Option 2: Select Existing Column</h4>
              <p style={{fontSize: '0.9rem', color: '#94a3b8'}}>Choose a numeric column to act as the final score.</p>
              <select 
                value={targetColumn} 
                onChange={(e) => setTargetColumn(e.target.value)}
                style={{width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-gradient)', color: 'white', border: '1px solid var(--primary)', marginBottom: '1rem'}}
              >
                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn" onClick={() => handleSetup('column')} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Use Selected Column'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
