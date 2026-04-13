"""
Model Training Script — XGBoost with Hyperparameter Tuning + SHAP Explainer
============================================================================
Run:  python train_model.py
"""

import pandas as pd
import numpy as np
import joblib
import time
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (classification_report, confusion_matrix,
                              roc_auc_score, accuracy_score, f1_score)

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    print("⚠️  xgboost not installed. Will train RandomForest only.")

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False
    print("⚠️  shap not installed. Will skip explainer generation.")

# ---- Config ----
DATA_FILE = "large_student_dataset.csv"
MODEL_FILE = "risk_model.pkl"
SHAP_EXPLAINER_FILE = "shap_explainer.pkl"
MODEL_METRICS_FILE = "model_metrics.pkl"

FEATURE_COLS = [
    "previous_grade", "attendance", "hours_studied_week",
    "assignments_completed", "quiz_avg", "forum_posts",
    "interaction_frequency", "video_completion_rate",
    "last_login_days_ago", "engagement_score",
]


def main():
    print("=" * 60)
    print("  AI Learning Analytics — Model Training Pipeline")
    print("=" * 60)

    # 1. Load data
    print("\n📂 Loading dataset...")
    df = pd.read_csv(DATA_FILE)
    print(f"   Loaded {len(df)} records with {len(df.columns)} columns.")

    X = df[FEATURE_COLS]
    y = df["at_risk"]
    print(f"   Class distribution: {dict(y.value_counts())}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")

    results = {}

    # 2. Train RandomForest baseline
    print("\n🌲 Training RandomForest baseline...")
    t0 = time.time()
    rf = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_time = time.time() - t0
    rf_pred = rf.predict(X_test)
    rf_prob = rf.predict_proba(X_test)[:, 1]
    rf_acc = accuracy_score(y_test, rf_pred)
    rf_f1 = f1_score(y_test, rf_pred)
    rf_auc = roc_auc_score(y_test, rf_prob)
    results["RandomForest"] = {"accuracy": rf_acc, "f1": rf_f1, "auc": rf_auc, "time": rf_time}
    print(f"   Accuracy: {rf_acc:.4f} | F1: {rf_f1:.4f} | AUC: {rf_auc:.4f} | Time: {rf_time:.1f}s")

    best_model = rf
    best_name = "RandomForest"

    # 3. Train XGBoost with grid search
    if HAS_XGB:
        print("\n🚀 Training XGBoost with GridSearchCV...")
        t0 = time.time()
        xgb_base = XGBClassifier(
            eval_metric="logloss", random_state=42, n_jobs=-1, use_label_encoder=False,
        )
        param_grid = {
            "n_estimators": [200, 300],
            "max_depth": [5, 8, 12],
            "learning_rate": [0.05, 0.1],
            "subsample": [0.8, 1.0],
            "colsample_bytree": [0.8, 1.0],
        }
        grid = GridSearchCV(
            xgb_base, param_grid, cv=3, scoring="roc_auc",
            n_jobs=-1, verbose=1, refit=True,
        )
        grid.fit(X_train, y_train)
        xgb_model = grid.best_estimator_
        xgb_time = time.time() - t0

        xgb_pred = xgb_model.predict(X_test)
        xgb_prob = xgb_model.predict_proba(X_test)[:, 1]
        xgb_acc = accuracy_score(y_test, xgb_pred)
        xgb_f1 = f1_score(y_test, xgb_pred)
        xgb_auc = roc_auc_score(y_test, xgb_prob)
        results["XGBoost"] = {"accuracy": xgb_acc, "f1": xgb_f1, "auc": xgb_auc, "time": xgb_time}

        print(f"\n   Best params: {grid.best_params_}")
        print(f"   Accuracy: {xgb_acc:.4f} | F1: {xgb_f1:.4f} | AUC: {xgb_auc:.4f} | Time: {xgb_time:.1f}s")

        if xgb_auc >= rf_auc:
            best_model = xgb_model
            best_name = "XGBoost"
            print(f"\n   ✅ XGBoost wins (AUC: {xgb_auc:.4f} vs {rf_auc:.4f})")
        else:
            print(f"\n   ✅ RandomForest wins (AUC: {rf_auc:.4f} vs {xgb_auc:.4f})")

    # 4. Final evaluation
    print(f"\n{'=' * 60}")
    print(f"  Best Model: {best_name}")
    print(f"{'=' * 60}")
    final_pred = best_model.predict(X_test)
    final_prob = best_model.predict_proba(X_test)[:, 1]
    print("\nClassification Report:")
    print(classification_report(y_test, final_pred, target_names=["On Track", "At Risk"]))
    cm = confusion_matrix(y_test, final_pred)
    print(f"Confusion Matrix:\n{cm}")

    # 5. Save model
    print(f"\n💾 Saving model to {MODEL_FILE}...")
    joblib.dump(best_model, MODEL_FILE)
    print("   Done.")

    # 6. Save metrics for dashboard
    from sklearn.metrics import roc_curve
    fpr, tpr, _ = roc_curve(y_test, final_prob)
    final_auc = roc_auc_score(y_test, final_prob)
    metrics_data = {
        "confusion_matrix": cm,
        "fpr": fpr,
        "tpr": tpr,
        "auc": final_auc,
        "accuracy": accuracy_score(y_test, final_pred),
        "f1": f1_score(y_test, final_pred),
        "best_model_name": best_name,
        "comparison": results,
        "classification_report": classification_report(y_test, final_pred, target_names=["On Track", "At Risk"], output_dict=True),
    }
    joblib.dump(metrics_data, MODEL_METRICS_FILE)
    print(f"   Metrics saved to {MODEL_METRICS_FILE}")

    # 7. Generate SHAP explainer
    if HAS_SHAP:
        print(f"\n🔬 Generating SHAP explainer...")
        t0 = time.time()
        # Use a sample for speed
        sample = X_train.sample(min(500, len(X_train)), random_state=42)
        explainer = shap.TreeExplainer(best_model, sample)
        shap_time = time.time() - t0
        joblib.dump(explainer, SHAP_EXPLAINER_FILE)
        print(f"   SHAP explainer saved to {SHAP_EXPLAINER_FILE} ({shap_time:.1f}s)")
    else:
        print("\n⚠️  Skipping SHAP explainer (shap not installed).")

    print(f"\n{'=' * 60}")
    print("  ✅ Training pipeline complete!")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
