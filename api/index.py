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

def get_start_of_quarter(date):
    quarter = (date.month - 1) // 3 + 1
    return datetime(date.year, 3 * quarter - 2, 1)

@app.get("/api/metrics")
def get_metrics(
    branch_id: Optional[str] = "all", 
    rep_id: Optional[str] = "all",
    timeframe: Optional[str] = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    data = load_data()
    all_leads = data.get("leads", [])
    branches = data.get("branches", [])
    sales_reps = data.get("sales_reps", [])
    
    # NEW: Add (BM) tag to the name if their role is branch_manager
    reps_dict = {
        rep['id']: f"{rep['name']} (BM)" if rep.get("role") == "branch_manager" else rep['name']
        for rep in sales_reps
    }
    
    generated_at_str = data.get("metadata", {}).get("generated_at")
    if generated_at_str:
        simulated_now = datetime.fromisoformat(generated_at_str.replace("Z", ""))
    else:
        simulated_now = datetime.now()
        
    formatted_current_date = simulated_now.strftime("%b %d, %Y")

    # ==========================================
    # FILTER STAGE 1: TIME-ONLY
    # ==========================================
    time_filtered_leads = all_leads
    
    if timeframe != "all":
        cutoff_start = None
        cutoff_end = simulated_now
        
        if timeframe == "today":
            cutoff_start = simulated_now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif timeframe == "this_week":
            cutoff_start = simulated_now - timedelta(days=simulated_now.weekday())
            cutoff_start = cutoff_start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif timeframe == "this_month":
            cutoff_start = simulated_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif timeframe == "this_quarter":
            cutoff_start = get_start_of_quarter(simulated_now)
        elif timeframe == "30":
            cutoff_start = simulated_now - timedelta(days=30)
        elif timeframe == "90":
            cutoff_start = simulated_now - timedelta(days=90)
        elif timeframe == "custom" and start_date and end_date:
            cutoff_start = datetime.strptime(start_date, "%Y-%m-%d")
            cutoff_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            
        if cutoff_start:
            temp_leads = []
            for l in time_filtered_leads:
                l_date = datetime.fromisoformat(l["last_activity_at"].replace("Z", ""))
                if cutoff_start <= l_date <= cutoff_end:
                    temp_leads.append(l)
            time_filtered_leads = temp_leads

    time_delivered_leads = [l for l in time_filtered_leads if l["status"] == "delivered"]
    
    # Ranked Branches (ALWAYS GLOBAL, NO SLICE LIMIT)
    branch_perf = []
    for b in branches:
        b_leads = [l for l in time_delivered_leads if l.get("branch_id") == b["id"]]
        branch_perf.append({
            "name": b["name"],
            "city": b["city"],
            "revenue": sum([l.get("deal_value", 0) for l in b_leads])
        })
    top_branches = sorted(branch_perf, key=lambda x: x["revenue"], reverse=True)

    # Ranked Reps (FILTERED BY BRANCH, INCLUDES ZERO PERFORMERS)
    rep_leaderboard_leads = time_delivered_leads
    if branch_id != "all":
        rep_leaderboard_leads = [l for l in time_delivered_leads if l.get("branch_id") == branch_id]
        
    rep_perf = {}
    for rep in sales_reps:
        if branch_id == "all" or rep.get("branch_id") == branch_id:
            rep_perf[rep['id']] = 0
            
    for l in rep_leaderboard_leads:
        r_id = l.get("assigned_to")
        if r_id in rep_perf:
            rep_perf[r_id] += l.get("deal_value", 0)
            
    top_reps_list = [{"name": reps_dict.get(r_id, "Unknown"), "revenue": rev} for r_id, rev in rep_perf.items()]
    top_reps = sorted(top_reps_list, key=lambda x: x["revenue"], reverse=True)

    # ==========================================
    # FILTER STAGE 2: BRANCH & REP (For Drill-down KPIs)
    # ==========================================
    fully_filtered_leads = time_filtered_leads
    
    if branch_id != "all":
        fully_filtered_leads = [l for l in fully_filtered_leads if l.get("branch_id") == branch_id]
    if rep_id != "all":
        fully_filtered_leads = [l for l in fully_filtered_leads if l.get("assigned_to") == rep_id]
        
    delivered_leads = [l for l in fully_filtered_leads if l["status"] == "delivered"]
    lost_leads = [l for l in fully_filtered_leads if l["status"] == "lost"]
    resolved_count = len(delivered_leads) + len(lost_leads)
    
    total_revenue = sum([l.get("deal_value", 0) for l in delivered_leads])
    conversion_rate = (len(delivered_leads) / resolved_count * 100) if resolved_count > 0 else 0

    active_pipeline = []
    active_leads = [l for l in fully_filtered_leads if l["status"] not in ["delivered", "lost"]]
    
    for lead in active_leads:
        last_activity = datetime.fromisoformat(lead["last_activity_at"].replace("Z", ""))
        days_stagnant = (simulated_now - last_activity).days
        active_pipeline.append({
            "id": lead["id"],
            "customer": lead.get("customer_name", "Unknown"),
            "model": lead.get("model_interested", "Unknown"),
            "stage": lead["status"].replace("_", " ").title(),
            "rep_name": reps_dict.get(lead["assigned_to"], "Unknown"),
            "days_stagnant": days_stagnant,
            "value": lead.get("deal_value", 0)
        })
        
    active_pipeline = sorted(active_pipeline, key=lambda x: x["days_stagnant"], reverse=True)
    
    # EXCLUDE "Order Placed" from being flagged as a bottleneck!
    stagnant_leads = [l for l in active_pipeline if l["days_stagnant"] > 7 and l["stage"] != "Order Placed"][:10]

    funnel_stages = ["new", "contacted", "test_drive", "negotiation", "order_placed"]
    pipeline_funnel = [{"stage": s.replace("_", " ").title(), "count": len([l for l in active_leads if l["status"] == s])} for s in funnel_stages]

    return {
        "current_date": formatted_current_date,
        "filters": {"branches": branches, "reps": sales_reps},
        "total_revenue": total_revenue,
        "conversion_rate": round(conversion_rate, 1),
        "total_deliveries": len(delivered_leads),
        "stagnant_leads": stagnant_leads,
        "active_pipeline": active_pipeline,
        "pipeline_funnel": pipeline_funnel,
        "top_branches": top_branches,
        "top_reps": top_reps
    }