import os
import json
import random
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

def format_currency(value):
    if value >= 10000000:
        return f"₹{value / 10000000:.2f} Cr"
    return f"₹{value / 100000:.1f} L"

def load_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'dealership_data.json')
    if not os.path.exists(file_path):
        file_path = os.path.join(current_dir, 'v3_dealership_data.json')
    with open(file_path, 'r') as f:
        return json.load(f)

def get_start_of_quarter(date):
    quarter = (date.month - 1) // 3 + 1
    return datetime(date.year, 3 * quarter - 2, 1)

def calculate_health_and_nba(deal_value, days_stagnant, stage):
    stage_bonus = {"new": 0, "contacted": 5, "test_drive": 10, "negotiation": 20, "order_placed": 30}
    bonus = stage_bonus.get(stage.lower(), 0)
    value_bonus = min(15, (deal_value / 500000)) 
    
    health = 100 - (days_stagnant * 5) + bonus + value_bonus
    health = max(0, min(100, int(health))) 

    nba = "Review deal strategy."
    if stage == "new" and days_stagnant > 1: nba = "Immediate Call/Reassign"
    elif stage == "test_drive" and days_stagnant > 3: nba = "Send Model Comparison Sheet"
    elif stage == "negotiation" and days_stagnant > 5: nba = "Manager Intervention / Offer Concession"
    elif days_stagnant > 10: nba = "Move to Nurture Sequence"

    return health, nba

@app.get("/api/metrics")
def get_metrics(
    branch_id: Optional[str] = "all", 
    rep_id: Optional[str] = "all",
    timeframe: Optional[str] = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    bottleneck_days: int = 7
):
    data = load_data()
    all_leads = data.get("leads", [])
    branches = data.get("branches", [])
    sales_reps = data.get("sales_reps", [])
    
    reps_dict = {rep['id']: f"{rep['name']} (BM)" if rep.get("role") == "branch_manager" else rep['name'] for rep in sales_reps}
    branches_dict = {b['id']: b['name'] for b in branches}
    
    generated_at_str = data.get("metadata", {}).get("generated_at")
    simulated_now = datetime.fromisoformat(generated_at_str.replace("Z", "")) if generated_at_str else datetime.now()
    formatted_current_date = simulated_now.strftime("%b %d, %Y")

    time_filtered_leads = all_leads
    if timeframe != "all":
        cutoff_start = None
        cutoff_end = simulated_now
        if timeframe == "today": cutoff_start = simulated_now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif timeframe == "this_week": cutoff_start = simulated_now - timedelta(days=simulated_now.weekday()); cutoff_start = cutoff_start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif timeframe == "this_month": cutoff_start = simulated_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif timeframe == "this_quarter": cutoff_start = get_start_of_quarter(simulated_now)
        elif timeframe == "30": cutoff_start = simulated_now - timedelta(days=30)
        elif timeframe == "90": cutoff_start = simulated_now - timedelta(days=90)
        elif timeframe == "custom" and start_date and end_date:
            cutoff_start = datetime.strptime(start_date, "%Y-%m-%d")
            cutoff_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        
        if cutoff_start:
            time_filtered_leads = [l for l in time_filtered_leads if cutoff_start <= datetime.fromisoformat(l["last_activity_at"].replace("Z", "")) <= cutoff_end]

    time_delivered_leads = [l for l in time_filtered_leads if l["status"] == "delivered"]
    
    branch_perf = []
    for b in branches:
        b_leads = [l for l in time_delivered_leads if l.get("branch_id") == b["id"]]
        bm_name = next((r["name"] for r in sales_reps if r.get("branch_id") == b["id"] and r.get("role") == "branch_manager"), "Unassigned")
        branch_perf.append({"name": b["name"], "city": b["city"], "manager": bm_name, "revenue": sum([l.get("deal_value", 0) for l in b_leads]), "units": len(b_leads)})
    top_branches = branch_perf
    
    rep_leaderboard_leads = time_delivered_leads if branch_id == "all" else [l for l in time_delivered_leads if l.get("branch_id") == branch_id]
    
    fully_filtered_leads = time_filtered_leads
    if branch_id != "all": fully_filtered_leads = [l for l in fully_filtered_leads if l.get("branch_id") == branch_id]
    if rep_id != "all": fully_filtered_leads = [l for l in fully_filtered_leads if l.get("assigned_to") == rep_id]
    
    rep_perf = {rep['id']: {"revenue": 0, "units": 0, "active_leads": 0} for rep in sales_reps if branch_id == "all" or rep.get("branch_id") == branch_id}
    for l in rep_leaderboard_leads:
        r_id = l.get("assigned_to")
        if r_id in rep_perf:
            rep_perf[r_id]["revenue"] += l.get("deal_value", 0)
            rep_perf[r_id]["units"] += 1
    
    for l in fully_filtered_leads:
        if l["status"] not in ["delivered", "lost"]:
            r_id = l.get("assigned_to")
            if r_id in rep_perf: rep_perf[r_id]["active_leads"] += 1
            
    top_reps = [{"name": reps_dict.get(r_id, "Unknown"), "revenue": d["revenue"], "units": d["units"], "active_leads": d["active_leads"]} for r_id, d in rep_perf.items()]

    delivered_leads = [l for l in fully_filtered_leads if l["status"] == "delivered"]
    lost_leads = [l for l in fully_filtered_leads if l["status"] == "lost"]
    pending_deals = [l for l in fully_filtered_leads if l["status"] == "order_placed"]
    
    resolved_count = len(delivered_leads) + len(pending_deals) + len(lost_leads)
    conversion_rate = ((len(delivered_leads) + len(pending_deals)) / resolved_count * 100) if resolved_count > 0 else 0
    
    total_revenue = sum([l.get("deal_value", 0) for l in delivered_leads])
    pending_revenue = sum([l.get("deal_value", 0) for l in pending_deals])

    monthly_revenue = {}
    for l in delivered_leads:
        date_obj = datetime.fromisoformat(l["last_activity_at"].replace("Z", ""))
        month_key = date_obj.strftime("%b %Y") 
        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + l.get("deal_value", 0)

    best_month = None
    if monthly_revenue:
        best_month_key = max(monthly_revenue, key=monthly_revenue.get)
        best_month = {
            "month": best_month_key,
            "revenue": monthly_revenue[best_month_key]
        }

    velocity_days = []
    for l in delivered_leads:
        random.seed(l['id'])
        days_to_close = random.randint(7, 35) 
        velocity_days.append(days_to_close)
    avg_velocity = sum(velocity_days) / len(velocity_days) if velocity_days else 0

    product_mix = {}
    marketing_roi = {}
    for l in fully_filtered_leads:
        model = l.get("model_interested", "Unknown")
        if l["status"] == "delivered":
            if model not in product_mix: product_mix[model] = {"revenue": 0, "units": 0}
            product_mix[model]["revenue"] += l.get("deal_value", 0)
            product_mix[model]["units"] += 1
        
        source = l.get("source", "Unknown")
        if source not in marketing_roi: marketing_roi[source] = {"total": 0, "won": 0}
        marketing_roi[source]["total"] += 1
        if l["status"] in ["delivered", "order_placed"]:
            marketing_roi[source]["won"] += 1

    product_mix_chart = [{"name": k, "revenue": v["revenue"], "units": v["units"]} for k, v in product_mix.items()]
    marketing_roi_chart = [{"source": k, "win_rate": int((v["won"]/v["total"])*100) if v["total"]>0 else 0, "leads": v["total"]} for k, v in marketing_roi.items()]

    active_quota = data.get('company_quarterly_quota', 100000000)
    if branch_id != "all":
        branch_data = next((b for b in branches if b['id'] == branch_id), None)
        active_quota = branch_data.get('quarterly_quota', 50000000) if branch_data else 50000000

    pacing_leads = all_leads
    if branch_id != "all": pacing_leads = [l for l in pacing_leads if l.get("branch_id") == branch_id]
    if rep_id != "all": pacing_leads = [l for l in pacing_leads if l.get("assigned_to") == rep_id]

    quarterly_pacing_data = {}
    for l in pacing_leads:
        if l["status"] in ["delivered", "order_placed"]:
            date_obj = datetime.fromisoformat(l["last_activity_at"].replace("Z", ""))
            q = (date_obj.month - 1) // 3 + 1
            q_str = f"Q{q} {date_obj.year}"
            
            if q_str not in quarterly_pacing_data:
                quarterly_pacing_data[q_str] = 0
            quarterly_pacing_data[q_str] += l.get("deal_value", 0)

    pacing_history = []
    for q_str, rev in quarterly_pacing_data.items():
        pacing = min(100, int((rev / active_quota) * 100)) if active_quota else 0
        pacing_history.append({
            "quarter": q_str,
            "revenue": rev,
            "quota": active_quota,
            "pacing": pacing
        })
    
    pacing_history.sort(key=lambda x: (int(x["quarter"][-4:]), int(x["quarter"][1])), reverse=True)
    
    if not pacing_history:
        current_q = (simulated_now.month - 1) // 3 + 1
        pacing_history.append({"quarter": f"Q{current_q} {simulated_now.year}", "revenue": 0, "quota": active_quota, "pacing": 0})

    active_pipeline = []
    active_leads = [l for l in fully_filtered_leads if l["status"] not in ["delivered", "lost"]]
    
    for lead in active_leads:
        last_activity = datetime.fromisoformat(lead["last_activity_at"].replace("Z", ""))
        days_stagnant = (simulated_now - last_activity).days
        health, nba = calculate_health_and_nba(lead.get("deal_value", 0), days_stagnant, lead["status"])
        
        active_pipeline.append({
            "id": lead["id"],
            "customer": lead.get("customer_name", "Unknown"),
            "model": lead.get("model_interested", "Unknown"),
            "stage": lead["status"].replace("_", " ").title(),
            "rep_name": reps_dict.get(lead["assigned_to"], "Unknown"),
            "branch_name": branches_dict.get(lead.get("branch_id"), "Unknown Branch"),
            "days_stagnant": days_stagnant,
            "value": lead.get("deal_value", 0),
            "health_score": health,
            "nba": nba,
            "source": lead.get("source", "Unknown")
        })
        
    active_pipeline = sorted(active_pipeline, key=lambda x: x["days_stagnant"], reverse=True)
    stagnant_leads = [l for l in active_pipeline if l["days_stagnant"] >= bottleneck_days and l["stage"] != "Order Placed"]

    capital_at_risk = sum([l['value'] for l in stagnant_leads if l["days_stagnant"] >= bottleneck_days])
    current_pacing = pacing_history[0] if pacing_history else {"quarter": "Current", "pacing": 0, "quota": 0, "revenue": 0}
    
    # ==========================================
    # WEIGHTED PRIORITY AI ENGINE
    # ==========================================
    insights_pool = []

    # 1. Pacing Gap
    if current_pacing.get('pacing', 0) < 100:
        gap = current_pacing.get('quota', 0) - current_pacing.get('revenue', 0)
        insights_pool.append({"score": 90 if current_pacing.get('pacing', 0) < 80 else 70, "text": f"🎯 Pacing Alert: You are {current_pacing.get('pacing', 0)}% to goal. A gap of {format_currency(gap)} remains for the quarter."})
    else:
        insights_pool.append({"score": 60, "text": f"🏆 Goal Crushed: You have exceeded the quarterly target by {current_pacing.get('pacing', 0) - 100}%. Excellent pacing."})

    # 2. Capital at Risk 
    if capital_at_risk > 1000000:
        insights_pool.append({"score": 95, "text": f"⚠️ High Risk: {format_currency(capital_at_risk)} is currently trapped in stagnant deals (idle for {bottleneck_days}+ days)."})
    elif capital_at_risk > 0:
        insights_pool.append({"score": 50, "text": f"⚠️ Monitor: {format_currency(capital_at_risk)} is sitting in idle pipeline stages."})

    # 3. Actionable Bottleneck
    if stagnant_leads:
        top_stagnant_value = sum(l['value'] for l in stagnant_leads[:3])
        insights_pool.append({"score": 85, "text": f"💡 Immediate Action: Reassigning or engaging the top 3 stagnant deals could unlock {format_currency(top_stagnant_value)}."})

    # 4. Sales Velocity
    if avg_velocity > 25:
        insights_pool.append({"score": 80, "text": f"⏳ Sluggish Cycles: Average time-to-close is high ({int(avg_velocity)} days). Review negotiation friction."})
    elif avg_velocity > 0:
        insights_pool.append({"score": 40, "text": f"⚡ Velocity: Deals are closing efficiently at an average of {int(avg_velocity)} days."})

    # 5. Conversion Rate
    if conversion_rate < 15:
        insights_pool.append({"score": 88, "text": f"📉 Conversion Drop: Win rate is currently {conversion_rate:.1f}%. Consider reviewing top-of-funnel lead quality."})
    elif conversion_rate >= 20:
        insights_pool.append({"score": 55, "text": f"📈 Strong Conversion: Win rate is healthy at {conversion_rate:.1f}%, indicating high-quality lead engagement."})
    # 6. Rep Burnout Risk
    overloaded_reps = [r['name'] for r in top_reps if r.get('active_leads', 0) > 15]
    if overloaded_reps:
        names = ", ".join(overloaded_reps[:2])
        insights_pool.append({"score": 92, "text": f"🔥 Burnout Risk: {names} are juggling >15 active deals. Re-route new inbound leads immediately."})

    # 7. Marketing ROI Focus
    if marketing_roi_chart:
        best_source = max(marketing_roi_chart, key=lambda x: x['win_rate'])
        if best_source['win_rate'] > 0:
            insights_pool.append({"score": 65, "text": f"📢 Marketing ROI: '{best_source['source']}' is your highest converting channel at {best_source['win_rate']}%. Double down on this spend."})

    # 8. Product Concentration Risk
    if product_mix_chart and total_revenue > 0:
        top_product = max(product_mix_chart, key=lambda x: x['revenue'])
        if top_product['revenue'] > (total_revenue * 0.5):
            insights_pool.append({"score": 75, "text": f"🚗 Inventory Risk: {top_product['name']} accounts for over 50% of revenue. Diversify marketing to push other models."})

    # 9. Top Branch Performance
    if top_branches and branch_id == "all":
        top_branch = top_branches[0]
        insights_pool.append({"score": 45, "text": f"🏅 Branch Leader: {top_branch['name']} is driving pipeline with {format_currency(top_branch['revenue'])} in revenue."})

    # 10. Best Month Comparison
    if best_month:
        insights_pool.append({"score": 30, "text": f"📅 Historical Context: Your highest grossing month on record remains {best_month['month']} ({format_currency(best_month['revenue'])})."})

    insights_pool.sort(key=lambda x: x['score'], reverse=True)
    smart_summaries = [insight['text'] for insight in insights_pool]

    funnel_stages = ["new", "contacted", "test_drive", "negotiation", "order_placed"]
    pipeline_funnel = [{"stage": s.replace("_", " ").title(), "count": len([l for l in active_leads if l["status"] == s])} for s in funnel_stages]

    return {
        "current_date": formatted_current_date,
        "filters": {"branches": branches, "reps": sales_reps},
        "total_revenue": total_revenue,
        "pending_revenue": pending_revenue, 
        "conversion_rate": round(conversion_rate, 1),
        "total_deliveries": len(delivered_leads),
        "total_leads": len(fully_filtered_leads), 
        "active_quota": active_quota, 
        "quota_pacing": current_pacing['pacing'] if current_pacing else 0, 
        "pacing_history": pacing_history, 
        "best_month": best_month, 
        "velocity": int(avg_velocity), 
        "capital_at_risk": capital_at_risk, 
        "product_mix": product_mix_chart, 
        "marketing_roi": marketing_roi_chart, 
        "smart_summaries": smart_summaries, 
        "stagnant_leads": stagnant_leads,
        "active_pipeline": active_pipeline,
        "pipeline_funnel": pipeline_funnel,
        "top_branches": top_branches,
        "top_reps": top_reps
    }