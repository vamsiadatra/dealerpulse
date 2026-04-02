from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from datetime import datetime
import os

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# Allow frontend to communicate with the Python backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, 'dealership_data.json')
    with open(file_path, 'r') as f:
        return json.load(f)

@app.get("/api/metrics")
def get_metrics():
    data = load_data()
    leads = data.get("leads", [])
    branches = data.get("branches", [])
    reps = {rep['id']: rep['name'] for rep in data.get("sales_reps", [])}
    
    # 1. Establish "Current" Date (Max date in dataset)
    max_timestamp = max([lead["last_activity_at"] for lead in leads])
    simulated_now = datetime.fromisoformat(max_timestamp.replace("Z", ""))

    delivered_leads = [l for l in leads if l["status"] == "delivered"]
    total_revenue = sum([l.get("deal_value", 0) for l in delivered_leads])
    conversion_rate = (len(delivered_leads) / len(leads)) * 100 if leads else 0

    # 2. Identify Stagnant Leads (Actionable Bottleneck)
    stagnant_leads = []
    active_leads = [l for l in leads if l["status"] not in ["delivered", "lost"]]
    
    for lead in active_leads:
        last_activity = datetime.fromisoformat(lead["last_activity_at"].replace("Z", ""))
        days_stagnant = (simulated_now - last_activity).days
        if days_stagnant > 7:
            lead_data = {
                "id": lead["id"],
                "customer": lead["customer_name"],
                "model": lead["model_interested"],
                "stage": lead["status"].replace("_", " ").title(),
                "rep_name": reps.get(lead["assigned_to"], "Unknown"),
                "days_stagnant": days_stagnant
            }
            stagnant_leads.append(lead_data)
            
    # Sort worst bottlenecks first
    stagnant_leads = sorted(stagnant_leads, key=lambda x: x["days_stagnant"], reverse=True)[:10]

    # 3. Branch Performance
    branch_perf = []
    for branch in branches:
        branch_leads = [l for l in delivered_leads if l.get("branch_id") == branch["id"]]
        revenue = sum([l.get("deal_value", 0) for l in branch_leads])
        branch_perf.append({
            "name": branch["city"],
            "revenue": revenue,
            "units": len(branch_leads)
        })

    return {
        "total_revenue": total_revenue,
        "conversion_rate": round(conversion_rate, 1),
        "total_deliveries": len(delivered_leads),
        "stagnant_leads": stagnant_leads,
        "branch_performance": sorted(branch_perf, key=lambda x: x["revenue"], reverse=True)
    }
