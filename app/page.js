"use client";
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, Car, AlertTriangle, Clock, Filter, Calendar, Download, Zap, Users, Trophy, Medal, MapPin, List, User } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [branchFilter, setBranchFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [conversionLift, setConversionLift] = useState(5); 

  useEffect(() => {
    setRepFilter("all");
  }, [branchFilter]);

  const fetchData = useCallback(() => {
    setLoading(true);
    let url = `/api/metrics?branch_id=${branchFilter}&rep_id=${repFilter}&timeframe=${timeFilter}`;
    if (timeFilter === 'custom' && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
        return res.json();
      })
      .then(json => {
        if (!json || typeof json.total_revenue === 'undefined' || !json.filters) {
          throw new Error("Received incomplete data from the backend.");
        }
        setData(json);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [branchFilter, repFilter, timeFilter, startDate, endDate]);

  useEffect(() => {
    if (timeFilter === 'custom' && (!startDate || !endDate)) return;
    fetchData();
  }, [fetchData, timeFilter, startDate, endDate]);

  const isRepView = repFilter !== "all";
  const tableData = isRepView ? data?.active_pipeline : data?.stagnant_leads;
  const tableTitle = isRepView ? "Complete Active Pipeline" : "Critical Bottlenecks";
  const tableSubtitle = isRepView ? "Full inventory of active deals for this representative." : "Leads going cold (>7 days idle).";

  const handleExportCSV = () => {
    if (!tableData || !tableData.length) return;
    const headers = ["Customer", "Model", "Stage", "Sales Rep", "Days Stuck"];
    const csvContent = [headers.join(","), ...tableData.map(l => `"${l.customer}","${l.model}","${l.stage}","${l.rep_name}",${l.days_stagnant}`)].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${isRepView ? 'active_pipeline' : 'stagnant_leads'}_${data.current_date || 'export'}.csv`;
    link.click();
  };

  const selectedBranchName = branchFilter !== 'all' && data?.filters?.branches 
    ? data.filters.branches.find(b => b.id === branchFilter)?.name 
    : 'Global';

  const getBadgeStyle = (index) => {
    if (index === 0) return 'bg-amber-200 text-amber-800'; 
    if (index === 1) return 'bg-slate-200 text-slate-700'; 
    if (index === 2) return 'bg-orange-200 text-orange-800'; 
    return 'bg-slate-100 text-slate-500'; 
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-rose-100 text-center text-rose-600 font-mono text-sm">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans text-slate-900 selection:bg-indigo-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg"><Car className="text-white w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight">Dealer<span className="text-indigo-600">Pulse</span></h1>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-slate-800 font-bold">v3</span>
            {data?.current_date && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>{data.current_date}</span>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] w-full mx-auto px-6 mt-8 space-y-6">
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="shrink-0">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Pipeline Health</h2>
            <p className="text-sm text-slate-500 mt-1">Drill down into specific branches, reps, and timelines.</p>
          </div>
          
          <div className="flex flex-wrap xl:flex-nowrap gap-3 items-center w-full xl:w-auto xl:justify-end">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-500" />
              <select className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="all">All Branches</option>
                {(data?.filters?.branches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {branchFilter !== "all" && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 transition-all shrink-0">
                <Users className="w-4 h-4 text-indigo-500" />
                <select className="bg-transparent text-sm font-medium text-indigo-900 outline-none cursor-pointer" value={repFilter} onChange={(e) => setRepFilter(e.target.value)}>
                  <option value="all">All Reps in Branch</option>
                  {(data?.filters?.reps || []).filter(r => r.branch_id === branchFilter).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shrink-0">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {timeFilter === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shrink-0">
                <input type="date" className="text-sm bg-transparent outline-none text-slate-700 cursor-pointer" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400 text-sm font-medium">to</span>
                <input type="date" className="text-sm bg-transparent outline-none text-slate-700 cursor-pointer" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {loading && <div className="h-1 bg-indigo-500 animate-pulse rounded-full w-full"></div>}

        {data && data.total_revenue !== undefined && (
          <>
            {/* UPDATED: 6-Column Grid to fit the new Best Month Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
              <StatCard title="Total Revenue" value={`₹${(data.total_revenue / 10000000).toFixed(2)} Cr`} icon={<IndianRupee className="text-emerald-600 w-5 h-5" />} />
              <StatCard title="Deliveries" value={data.total_deliveries} icon={<Car className="text-blue-600 w-5 h-5" />} />
              <StatCard title="Win Rate" value={`${data.conversion_rate}%`} subtitle="Closed-Won Deals" icon={<TrendingUp className="text-indigo-600 w-5 h-5" />} />
              
              {/* NEW: Dynamic Best Month Card */}
              <StatCard 
                title="Top Month" 
                value={data.best_month?.month || 'N/A'} 
                subtitle={data.best_month ? `Generated ₹${(data.best_month.revenue / 10000000).toFixed(2)} Cr` : ''}
                icon={<Calendar className="text-purple-600 w-5 h-5" />} 
              />

              <StatCard title="Bottlenecks" value={data.stagnant_leads?.length || 0} icon={<AlertTriangle className="text-rose-600 w-5 h-5" />} alert />
              
              <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1 mb-2"><Zap className="w-3 h-3" /> WHAT-IF FORECAST</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight">+₹{((data.total_revenue * (conversionLift / 100)) / 100000).toFixed(1)} L</p>
                <p className="text-xs text-slate-500 mt-1">If win rate improves by {conversionLift}%</p>
                {/* UPDATED: Slider max changed to 25 */}
                <input type="range" min="1" max="25" value={conversionLift} onChange={(e) => setConversionLift(e.target.value)} className="w-full mt-3 accent-indigo-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 lg:col-span-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900">Active Pipeline Funnel</h3>
                  <p className="text-xs text-slate-500 mt-1">Where are leads dropping off?</p>
                </div>
                <div className="flex-grow w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pipeline_funnel || []} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                        {(data.pipeline_funnel || []).map((entry, index) => <Cell key={`cell-${index}`} fill="#6366f1" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden lg:col-span-2 flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{tableTitle}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tableSubtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    {!isRepView && (
                      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-100">
                        <Clock className="w-3.5 h-3.5" /> High Priority
                      </span>
                    )}
                    {isRepView && (
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-100">
                        <List className="w-3.5 h-3.5" /> All Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto flex-grow">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Stage</th>
                        <th className="px-6 py-4">Assigned Rep</th>
                        <th className="px-6 py-4 text-right">Time Idle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!tableData || tableData.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-8 text-slate-500">No active deals found for this selection.</td></tr>
                      ) : (
                        tableData.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {lead.customer} 
                              <div className="text-xs text-slate-400 font-normal">{lead.model} • ₹{(lead.value / 100000).toFixed(1)}L</div>
                            </td>
                            <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">{lead.stage}</span></td>
                            <td className="px-6 py-4 text-slate-600">{lead.rep_name}</td>
                            <td className={`px-6 py-4 text-right font-semibold ${lead.days_stagnant > 7 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {lead.days_stagnant} days
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-900">Ranked Dealerships (Global)</h3>
                  </div>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
                  {!data.top_branches || data.top_branches.length === 0 ? (
                    <p className="text-sm text-slate-500">No data for selected timeframe.</p>
                  ) : (
                    data.top_branches.map((branch, index) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getBadgeStyle(index)}`}>
                            {index + 1}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 block">{branch.name}</span>
                            {/* UPDATED: Neutralized BM text color to match the map pin */}
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/>{branch.city}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1"><User className="w-3 h-3"/>{branch.manager}</span>
                            </div>
                          </div>
                        </div>
                        <span className="font-semibold text-amber-700">₹{(branch.revenue / 10000000).toFixed(2)} Cr</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-semibold text-slate-900">Ranked Sales Reps ({selectedBranchName})</h3>
                  </div>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
                  {!data.top_reps || data.top_reps.length === 0 ? (
                    <p className="text-sm text-slate-500">No reps found for selected timeframe.</p>
                  ) : (
                    data.top_reps.map((rep, index) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getBadgeStyle(index)}`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-slate-900">{rep.name}</span>
                        </div>
                        <span className="font-semibold text-indigo-600">₹{(rep.revenue / 100000).toFixed(1)} L</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, alert }) {
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border transition-all ${alert ? 'border-rose-200 ring-1 ring-rose-50' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {subtitle && <p className="text-[10px] font-medium text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${alert ? 'bg-rose-50' : 'bg-slate-50'}`}>{icon}</div>
      </div>
    </div>
  );
}