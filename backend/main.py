import os
import io
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_curve, roc_auc_score, precision_score, recall_score, f1_score
import shap

app = FastAPI(title="AI Learning Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FEATURE_COLS = [
    "previous_grade", "attendance", "hours_studied_week",
    "assignments_completed", "quiz_avg", "forum_posts",
    "interaction_frequency", "video_completion_rate",
    "last_login_days_ago", "engagement_score",
]

# Global in-memory session (for single-user local hackathon usage)
SESSION = {
    "raw_data": None,
    "model": None,
    "explainer": None,
    "metrics": None,
    "setup_phase": "UPLOAD" # UPLOAD, NEEDS_TARGET, READY
}

def create_demo_data(n=2000):
    rng = np.random.default_rng(42)
    df = pd.DataFrame({
        "student_id": np.arange(1, n+1),
        "first_name": rng.choice(["Aarav","Aditi","Arjun","Diya","Ishaan","Kavya","Rohan"], n),
        "last_name": rng.choice(["Sharma","Patel","Gupta","Singh","Kumar"], n),
        "email": [f"user{i}@uni.edu" for i in range(1, n+1)],
        "course_enrolled": rng.choice(["CS101", "MATH201", "ENG102"], n),
        "learning_style": rng.choice(["Visual", "Auditory", "Kinesthetic", "Reading/Writing"], n),
        "previous_grade": rng.integers(35, 100, n),
        "attendance": rng.integers(40, 100, n),
        "hours_studied_week": np.round(rng.uniform(1, 30, n), 1),
        "assignments_completed": rng.integers(0, 11, n),
        "quiz_avg": rng.integers(30, 100, n),
        "forum_posts": rng.integers(0, 20, n),
        "interaction_frequency": rng.integers(5, 200, n),
        "video_completion_rate": np.round(rng.uniform(15, 100, n), 1),
        "last_login_days_ago": rng.integers(0, 30, n),
        "engagement_score": np.round(rng.uniform(5, 100, n), 1),
    })
    df["final_score"] = (0.3*df["previous_grade"] + 0.2*df["attendance"] + 0.2*df["quiz_avg"] +
                         0.15*(df["hours_studied_week"]/30*100) + 0.15*df["engagement_score"]).clip(0, 100).round(1)
    df["at_risk"] = (df["final_score"] < 60).astype(int)
    return df

def generate_recs(student, course, style):
    recs = []
    if student.get("attendance", 100) < 75: recs.append({"icon": "📅", "text": f"Attendance is {student['attendance']}%. Commit to attending the next 3 {course} sessions."})
    if student.get("hours_studied_week", 30) < 10: recs.append({"icon": "⏱️", "text": "Studied under 10 hrs/week. Block 2 uninterrupted hours every evening."})
    if student.get("quiz_avg", 100) < 65:
        if style == "Visual": recs.append({"icon": "🎨", "text": "Create a visual mind-map covering weak quiz topics."})
        elif style == "Auditory": recs.append({"icon": "🎧", "text": "Listen to the recorded review session for your weakest quiz."})
        else: recs.append({"icon": "🧠", "text": "Review past quiz mistakes and retake practice assessments."})
    if student.get("video_completion_rate", 100) < 50: recs.append({"icon": "📺", "text": "You've missed half the video content. Watch the next 3 required modules."})
    if not recs: recs.append({"icon": "🌟", "text": f"Outstanding performance! Consider mentoring a struggling peer in {course}."})
    return recs

def train_model(df):
    X, y = df[FEATURE_COLS], df["at_risk"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    y_pred, y_proba = model.predict(X_test), model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    
    metrics = {
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "accuracy": model.score(X_test, y_test),
        "cm": confusion_matrix(y_test, y_pred).tolist(),
        "roc": {"fpr": fpr.tolist(), "tpr": tpr.tolist(), "auc": roc_auc_score(y_test, y_proba)},
        "importances": pd.Series(model.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False).to_dict()
    }
    
    model.fit(X, y)
    explainer = shap.TreeExplainer(model)
    return model, explainer, metrics

@app.get("/api/state")
def get_state():
    return {
        "setup_phase": SESSION["setup_phase"],
        "has_data": SESSION["raw_data"] is not None
    }

@app.post("/api/demo")
def load_demo():
    SESSION["raw_data"] = create_demo_data(3000)
    SESSION["setup_phase"] = "READY"
    return {"status": "success"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        missing = [c for c in FEATURE_COLS if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing columns: {','.join(missing)}")
            
        SESSION["raw_data"] = df
        if "final_score" not in df.columns or "at_risk" not in df.columns:
            SESSION["setup_phase"] = "NEEDS_TARGET"
        else:
            SESSION["setup_phase"] = "READY"
            
        return {"status": "success", "setup_phase": SESSION["setup_phase"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SetupRequest(BaseModel):
    method: str
    target_column: str = None

@app.post("/api/setup")
def setup_target(req: SetupRequest):
    df = SESSION["raw_data"]
    if df is None:
        raise HTTPException(status_code=400, detail="No data available")
        
    if req.method == "default":
        df["final_score"] = (df["quiz_avg"]*0.4 + df["attendance"]*0.4 + df["assignments_completed"]*2).clip(0,100)
        df["at_risk"] = (df["final_score"] < 60).astype(int)
    else:
        df["final_score"] = df[req.target_column]
        df["at_risk"] = (df["final_score"] < 60).astype(int)
        
    SESSION["raw_data"] = df
    SESSION["setup_phase"] = "READY"
    return {"status": "success"}

@app.get("/api/columns")
def get_columns():
    if SESSION["raw_data"] is None:
        return {"columns": []}
    return {"columns": SESSION["raw_data"].select_dtypes(include=np.number).columns.tolist()}

@app.get("/api/dashboard")
def get_dashboard():
    if SESSION["raw_data"] is None or SESSION["setup_phase"] != "READY":
        raise HTTPException(status_code=400, detail="Data not ready")
        
    df = SESSION["raw_data"]
    if SESSION["model"] is None:
        model, explainer, metrics = train_model(df)
        SESSION["model"] = model
        SESSION["explainer"] = explainer
        SESSION["metrics"] = metrics
        
    risk_count = int(df["at_risk"].sum())
    total_count = len(df)
    
    # Calculate target distribution for pie chart
    target_dist = {str(k): int(v) for k, v in df["at_risk"].value_counts().items()}
    
    return {
        "metrics": SESSION["metrics"],
        "summary": {
            "total": total_count,
            "risk_count": risk_count,
            "risk_percentage": round((risk_count / total_count) * 100, 1)
        },
        "target_distribution": target_dist
    }

@app.get("/api/roster")
def get_roster():
    if SESSION["raw_data"] is None or SESSION["model"] is None:
        raise HTTPException(status_code=400, detail="Data not ready")
        
    df = SESSION["raw_data"]
    model = SESSION["model"]
    
    probs = model.predict_proba(df[FEATURE_COLS])[:, 1] * 100
    
    roster_df = df[["student_id", "first_name", "last_name", "attendance", "quiz_avg", "hours_studied_week", "course_enrolled", "learning_style"]].copy()
    roster_df["risk_probability"] = np.round(probs, 1)
    roster_df["status"] = roster_df["risk_probability"].apply(lambda p: "🔴 High Risk" if p > 50 else "🟡 Warning" if p > 30 else "🟢 Safe")
    
    # Generate recommendations for top action
    dict_records = df.replace({np.nan: None}).to_dict(orient="records")
    top_actions = []
    for r in dict_records:
        recs = generate_recs(r, r.get("course_enrolled", ""), r.get("learning_style", ""))
        top_actions.append(recs[0]["text"] if recs else "None")
        
    roster_df["top_action"] = top_actions
    
    return {"roster": roster_df.replace({np.nan: None}).to_dict(orient="records")}

@app.get("/api/student/{student_id}")
def get_student(student_id: int):
    if SESSION["raw_data"] is None or SESSION["model"] is None:
        raise HTTPException(status_code=400, detail="Data not ready")
        
    df = SESSION["raw_data"]
    student_df = df[df["student_id"] == student_id]
    if student_df.empty:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student = student_df.iloc[0].to_dict()
    model = SESSION["model"]
    explainer = SESSION["explainer"]
    
    features_df = pd.DataFrame([student])[FEATURE_COLS]
    prob = model.predict_proba(features_df)[0][1]
    
    # SHAP logic
    sv_obj = explainer(features_df)
    try:
        if hasattr(sv_obj, "shape") and len(sv_obj.shape) == 3: sv = sv_obj[:, :, 1].values[0]; bv = sv_obj[:, :, 1].base_values[0]
        elif isinstance(sv_obj, list): sv = sv_obj[1].values[0]; bv = sv_obj[1].base_values[0]
        else: sv = sv_obj.values[0]; bv = sv_obj.base_values[0]
    except:
        sv = np.zeros(len(FEATURE_COLS))
        
    idx = np.argsort(np.abs(sv))[::-1][:10]
    sv_sorted = sv[idx][::-1].tolist()
    names_sorted = [FEATURE_COLS[i] for i in idx][::-1]
    
    # Radar logic
    s_vals = {k: student[k]/100 for k in ["attendance", "quiz_avg", "video_completion_rate", "engagement_score"]}
    a_vals = {k: df[k].mean()/100 for k in ["attendance", "quiz_avg", "video_completion_rate", "engagement_score"]}
    
    recs = generate_recs(student, student.get("course_enrolled", ""), student.get("learning_style", ""))
    
    return {
        "profile": student,
        "risk_probability": round(prob * 100, 1),
        "shap": {
            "values": sv_sorted,
            "names": names_sorted
        },
        "radar": {
            "student": s_vals,
            "average": a_vals
        },
        "recommendations": recs
    }

class SimRequest(BaseModel):
    features: dict
    
@app.post("/api/simulate")
def simulate(req: SimRequest):
    if SESSION["model"] is None:
        raise HTTPException(status_code=400, detail="Data not ready")
        
    df_sim = pd.DataFrame([req.features])
    prob = SESSION["model"].predict_proba(df_sim[FEATURE_COLS])[0][1]
    
    explainer = SESSION["explainer"]
    sv_obj = explainer(df_sim)
    try:
        if hasattr(sv_obj, "shape") and len(sv_obj.shape) == 3: sv = sv_obj[:, :, 1].values[0]; bv = sv_obj[:, :, 1].base_values[0]
        elif isinstance(sv_obj, list): sv = sv_obj[1].values[0]; bv = sv_obj[1].base_values[0]
        else: sv = sv_obj.values[0]; bv = sv_obj.base_values[0]
    except:
        sv = np.zeros(len(FEATURE_COLS))
        
    idx = np.argsort(np.abs(sv))[::-1][:10]
    sv_sorted = sv[idx][::-1].tolist()
    names_sorted = [FEATURE_COLS[i] for i in idx][::-1]
    
    return {
        "risk_probability": round(prob * 100, 1),
        "shap": {
            "values": sv_sorted,
            "names": names_sorted
        }
    }
