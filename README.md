# 🎓 AI Learning Analytics Platform

This fully self-contained Streamlit application is designed to predict student risk (e.g., dropping out) and provide actionable, AI-driven recommendations based on an Explanatory Data Analysis (EDA) of student behavior. This serves as an end-to-end framework, ready for presentation logic at hackathons.

## Features Added for the Hackathon Upgrade
* **Target Feature Wizard:** Now natively inspects uploaded files and dynamically handles creating the Target Column via an in-app Setup module if it's missing from the raw data.
* **Interactive Dataframe Flow:** Employs Streamlit's new Event selections so that when judges or users click on a student in the Class Overview list, their context automatically synchronizes downstream for reviewing specific reports.
* **Extended Metrics:** Evaluates model precision, recall, accuracy, and F1 scoring natively alongside an updated, responsive ROC Curve graph.
* **Sidebar Exports:** Download the compiled `.pkl` risk model, the generated prediction scores, and visualize the top 3 driving features per test-set.
* **Streamlined Reporting:** Instantly output any student's metrics to a native, styled HTML file. 
* **Polish and Visual Language:** Generous use of spinners, success toasts, layout tweaks, rounded corners, drop shadows, and responsive UI scaling. 

## 🚀 Running the App

### Requirements

1. Make sure you have python 3.9+ installed natively or run in a virtual environment.
2. Install the necessary packages via `pip`:
   ```bash
   pip install -r requirements.txt
   ```

### Execution

Run the Streamlit application using:
```bash
streamlit run app.py
```

### Usage Workflow

1. Wait for the app to initialize the `UPLOAD` page.
2. Drag and drop your `.csv` dataset. Don't have one? Simply click "🎲 Use Demo Dataset" to populate a heavily detailed test dataset.
3. If your dataset lacks `final_score` or `at_risk`, the platform will halt and ask you to determine how it determines the model's target labels. Check either a customized numerical set or proceed with default assumptions. 
4. The dashboard unlocks! Review **EDA & Metrics**, the **Class Overview**, generate specific **Student Reports**, or test variables using the real-time **Simulator**.
5. Extract predictions and exports at will via the Sidebar.
