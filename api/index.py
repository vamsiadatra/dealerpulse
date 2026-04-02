import os
import json
from datetime import datetime, timedelta
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'dealership_data.json')
    with open(file_path, 'r') as f:
        return json.load(f)

@app.get("/api/metrics")
def get_metrics(branch_id: Optional[str] = "all", timeframe: Optional[str] = "all"):
    data = load_data()
    all_leads = data.get("leads", [])
    branches = data.get("branches", [])
    reps = {rep['id']: rep['name'] for rep in data.get("sales_reps", [])}
    
    # Establish "Current" Date (Max date in dataset)
    max_timestamp = max([lead["last_activity_at"] for lead in all_leads])
    simulated_now = datetime.fromisoformat(max_timestamp.replace("Z", ""))

    # --- FILTERING ENGINE ---
    filtered_leads = all_leads
    
    # 1. Filter by Branch
    if branch_id != "all":
        filtered_leads = [l for l in filtered_leads if l.get("branch_id") == branch_id]
        
    # 2. Filter by Timeframe (based on last activity)
    if timeframe == "30":
        cutoff = simulated_now - timedelta(days=30)
        filtered_leads = [l for l in filtered_leads if datetime.fromisoformat(l["last_activity_at"].replace("Z", "")) >= cutoff]
    elif timeframe == "90":
        cutoff = simulated_now - timedelta(days=90)
        filtered_leads = [l for l in filtered_leads if datetime.fromisoformat(l["last_activity_at"].replace("Z", "")) >= cutoff]

    # --- METRICS CALCULATION ---
    delivered_leads = [l for l in filtered_leads if l["status"] == "delivered"]
    total_revenue = sum([l.get("deal_value", 0) for l in delivered_leads])
    conversion_rate = (len(delivered_leads) / len(filtered_leads)) * 100 if filtered_leads else 0

    # Bottlenecks (Stagnant Leads > 7 days)
    stagnant_leads = []
    active_leads = [l for l in filtered_leads if l["status"] not in ["delivered", "lost"]]
    
    for lead in active_leads:
        last_activity = datetime.fromisoformat(lead["last_activity_at"].replace("Z", ""))
        days_stagnant = (simulated_now - last_activity).days
        if days_stagnant > 7:
            stagnant_leads.append({
                "id": lead["id"],
                "customer": lead["customer_name"],
                "model": lead["model_interested"],
                "stage": lead["status"].replace("_", " ").title(),
                "rep_name": reps.get(lead["assigned_to"], "Unknown"),
                "days_stagnant": days_stagnant
            })
            
    stagnant_leads = sorted(stagnant_leads, key=lambda x: x["days_stagnant"], reverse=True)[:10]

    # Branch Performance (Only calculate if viewing 'all' branches to save UI space)
    branch_perf = []
    if branch_id == "all":
        for b in branches:
            b_leads = [l for l in delivered_leads if l.get("branch_id") == b["id"]]
            branch_perf.append({
                "name": b["city"],
                "revenue": sum([l.get("deal_value", 0) for l in b_leads]),
                "units": len(b_leads)
            })

    # Conversion Funnel (Active Pipeline Distribution)
    funnel_stages = ["new", "contacted", "test_drive", "negotiation", "order_placed"]
    pipeline_funnel = [{"stage": s.replace("_", " ").title(), "count": len([l for l in active_leads if l["status"] == s])} for s in funnel_stages]

    return {
        "filters": {"branches": branches},
        "total_revenue": total_revenue,
        "conversion_rate": round(conversion_rate, 1),
        "total_deliveries": len(delivered_leads),
        "stagnant_leads": stagnant_leads,
        "branch_performance": sorted(branch_perf, key=lambda x: x["revenue"], reverse=True),
        "pipeline_funnel": pipeline_funnel
    }
