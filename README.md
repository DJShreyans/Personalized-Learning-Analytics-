# 🎓 AI Learning Analytics Platform

A high-performance, modern web application designed for student risk prediction and personalized intervention. Built with a decoupled architecture using a **FastAPI** backend and a **React (Vite)** frontend, this platform leverages Random Forest and SHAP explainability to provide deep insights into student success.

## 🚀 Modern Architecture
*   **Backend:** FastAPI (Python) - High-performance REST API handling ML inference and SHAP computations.
*   **Frontend:** React + Vite - A premium, glassmorphic UI with interactive Plotly visualizers.
*   **AI/ML:** Scikit-Learn (Random Forest) & SHAP (Explainable AI).

## 📂 Project Structure
*   `backend/`: Contains the FastAPI server, ML logic, and requirements.
*   `frontend/`: Contains the React source code and dashboard components.

## 🛠️ Execution Instructions

To run the full platform, you need to start two separate services:

### 1. Start the Backend API
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
*API will be available at: http://localhost:8000*

### 2. Start the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*Dashboard will be available at: http://localhost:5173*

## 🌟 Key Features
*   **Explainable AI:** Real-time SHAP waterfall charts explaining *why* a student is at risk.
*   **Interactive Roster:** Single-click navigation between class overview and detailed student reports.
*   **Target Wizard:** Automatically detects missing data labels and provides a setup wizard to define risk parameters.
*   **Visual Analytics:** Radar charts, ROC curves, and Gauge meters powered by Plotly.js.
