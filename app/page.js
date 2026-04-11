"use client";
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, Car, AlertTriangle, Clock, Filter, Calendar, Download, Zap, Users, Trophy, Medal, MapPin, List, User, Info, Search, ChevronUp, ChevronDown, X, RefreshCw, Sparkles, Target } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [branchFilter, setBranchFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bottleneckDays, setBottleneckDays] = useState(7); 
  const [conversionLift, setConversionLift] = useState(5); 

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'health_score', direction: 'asc' });
  
  const [repSort, setRepSort] = useState('revenue');
  const [branchSort, setBranchSort] = useState('revenue'); 

  const handleStateReset = () => {
    setBranchFilter("all"); setRepFilter("all"); setTimeFilter("all"); setStartDate(""); setEndDate(""); setBottleneckDays(7); setSearchTerm(""); setSortConfig({ key: 'health_score', direction: 'asc' });
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    let url = `/api/metrics?branch_id=${branchFilter}&rep_id=${repFilter}&timeframe=${timeFilter}&bottleneck_days=${bottleneckDays}`;
    if (timeFilter === 'custom' && startDate && endDate) url += `&start_date=${startDate}&end_date=${endDate}`;

    fetch(url).then(async (res) => {
        if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
        return res.json();
      }).then(json => {
        setData(json); setLoading(false); setError(null);
      }).catch(err => {
        setError(err.message); setLoading(false);
      });
  }, [branchFilter, repFilter, timeFilter, startDate, endDate, bottleneckDays]);

  const handleForceRefresh = () => { handleStateReset(); fetchData(); };

  useEffect(() => { setRepFilter("all"); }, [branchFilter]);
  useEffect(() => {
    if (timeFilter === 'custom' && (!startDate || !endDate)) return;
    fetchData();
  }, [fetchData, timeFilter, startDate, endDate, bottleneckDays]);

  const isRepView = repFilter !== "all";
  const rawTableData = isRepView ? data?.active_pipeline : data?.stagnant_leads;
  const tableTitle = isRepView ? "Active Pipeline" : "Actionable Bottlenecks";
  
  let processedTableData = rawTableData ? [...rawTableData] : [];
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    processedTableData = processedTableData.filter(item => 
      item.customer.toLowerCase().includes(term) || item.rep_name.toLowerCase().includes(term) || item.model.toLowerCase().includes(term) || item.stage.toLowerCase().includes(term)
    );
  }

  if (sortConfig.key) {
    processedTableData.sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });

  const handleExportCSV = () => {
    if (!processedTableData || !processedTableData.length) return;
    const headers = ["Customer", "Model", "Est. Revenue", "Stage", "Health Score", "Sales Rep", "Branch", "Days Stuck"];
    const csvContent = [headers.join(","), ...processedTableData.map(l => `"${l.customer}","${l.model}",${l.value},"${l.stage}",${l.health_score},"${l.rep_name}","${l.branch_name}",${l.days_stagnant}`)].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${isRepView ? 'active_pipeline' : 'stagnant_leads'}_${data.current_date || 'export'}.csv`;
    link.click();
  };

  const selectedBranchName = branchFilter !== 'all' && data?.filters?.branches ? data.filters.branches.find(b => b.id === branchFilter)?.name : 'Global';

  const getBadgeStyle = (index) => {
    if (index === 0) return 'bg-amber-200 text-amber-800 ring-2 ring-amber-100 z-10'; 
    if (index === 1) return 'bg-slate-200 text-slate-700 ring-2 ring-slate-100 z-10'; 
    if (index === 2) return 'bg-orange-200 text-orange-800 ring-2 ring-orange-100 z-10'; 
    return 'bg-white border border-slate-200 text-slate-500 z-10'; 
  };

  const SortHeader = ({ label, sortKey, alignRight }) => (
    <th className={`px-6 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors select-none ${alignRight ? 'text-right' : 'text-left'}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1.5 ${alignRight ? 'justify-end' : 'justify-start'}`}>
        {label}
        {sortConfig.key === sortKey ? (
          sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600"/> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600"/>
        ) : <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-20 transition-opacity"/>}
      </div>
    </th>
  );

  const sortedBranches = [...(data?.top_branches || [])].map(b => ({...b, avg_deal: b.units > 0 ? b.revenue / b.units : 0})).sort((a, b) => b[branchSort] - a[branchSort]);
  const maxBranchMetric = sortedBranches.length > 0 ? sortedBranches[0][branchSort] : 1;
  const sortedReps = [...(data?.top_reps || [])].map(r => ({...r, avg_deal: r.units > 0 ? r.revenue / r.units : 0})).sort((a, b) => b[repSort] - a[repSort]);
  const maxRepMetric = sortedReps.length > 0 ? sortedReps[0][repSort] : 1;

  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><div className="bg-white p-8 rounded-2xl shadow-lg text-rose-600 font-mono text-sm">{error}</div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans text-slate-900 selection:bg-indigo-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm relative">
        <div className="max-w-[1600px] w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={handleStateReset}>
              <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors"><Car className="text-white w-5 h-5" /></div>
              <h1 className="text-xl font-bold tracking-tight">Dealer<span className="text-indigo-600 group-hover:text-indigo-700 transition-colors">Pulse</span></h1>
            </div>
            <button onClick={handleForceRefresh} className="hidden sm:flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors border border-indigo-200">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Data
            </button>
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
        {loading && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
      </nav>

      <div className="max-w-[1600px] w-full mx-auto px-6 mt-8 space-y-6">
        
        {/* NEW V3 FEATURE: AI Smart Insights */}
        {data?.smart_summaries && (
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-6 text-white border border-indigo-800">
             <div className="flex items-center gap-3 shrink-0">
                <Sparkles className="text-amber-400 w-8 h-8 animate-pulse" />
                <div>
                    <h2 className="text-sm font-bold tracking-widest uppercase text-indigo-300">AI Intelligence</h2>
                    <p className="text-xs text-slate-300">Executive Summary</p>
                </div>
             </div>
             <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 border-l border-indigo-800/50 pl-6">
                {data.smart_summaries.map((summary, idx) => (
                    <div key={idx} className="text-sm font-medium text-slate-200 leading-snug">{summary}</div>
                ))}
             </div>
          </div>
        )}

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="shrink-0">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Pipeline Health</h2>
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
                  {(data?.filters?.reps || []).filter(r => r.branch_id === branchFilter).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 shrink-0">
                <input type="date" className="text-sm bg-transparent outline-none text-indigo-900 cursor-pointer" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-indigo-400 text-sm font-medium">to</span>
                <input type="date" className="text-sm bg-transparent outline-none text-indigo-900 cursor-pointer" value={endDate} onChange={e => setEndDate(e.target.value)} />
                {(startDate || endDate) && (
                  <button onClick={() => {setStartDate(''); setEndDate('');}} className="ml-1 p-1 hover:bg-indigo-200 rounded-full transition-colors text-indigo-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {data && (
          <>
            {/* KPI STRIP - 6 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
              <StatCard title="Total Revenue" value={`₹${(data.total_revenue / 10000000).toFixed(2)} Cr`} subtitle={`+ ₹${(data.pending_revenue / 100000).toFixed(1)} L Pending`} icon={<IndianRupee className="text-emerald-600 w-5 h-5" />} tooltip="Recognized revenue from delivered vehicles. Pending revenue represents placed orders awaiting logistics."/>
              
              {/* NEW V3 FEATURE: Quota Pacing Gauge */}
              <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200 flex flex-col justify-center relative">
                 <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Target Pacing</p>
                 <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                       <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="4" />
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-600" strokeWidth="4" strokeDasharray="100" strokeDashoffset={100 - data.quota_pacing} strokeLinecap="round" />
                       </svg>
                       <span className="absolute text-xs font-bold text-slate-800">{data.quota_pacing}%</span>
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 tracking-tight">Q1 Target</h3>
                       <p className="text-[10px] font-medium text-slate-500 mt-0.5">Booked + pending</p>
                    </div>
                 </div>
                 <div className="absolute top-5 right-5 p-2.5 rounded-xl bg-slate-50"><Target className="w-5 h-5 text-indigo-600" /></div>
              </div>

              <StatCard title="Deliveries" value={data.total_deliveries} subtitle={`Out of ${data.total_leads} Leads`} icon={<Car className="text-blue-600 w-5 h-5" />} />
              <StatCard title="Win Rate" value={`${data.conversion_rate}%`} subtitle="Delivered + Placed" icon={<TrendingUp className="text-indigo-600 w-5 h-5" />} />
              
              <StatCard title="Bottlenecks" value={data.stagnant_leads?.length || 0} icon={<AlertTriangle className="text-rose-600 w-5 h-5" />} alert>
                <select className="mt-1.5 bg-rose-50/50 text-rose-700 hover:bg-rose-100 transition-colors text-[10px] font-semibold py-1 px-2 rounded-md outline-none cursor-pointer border border-rose-200" value={bottleneckDays} onChange={(e) => setBottleneckDays(Number(e.target.value))}>
                  <option value={1}>🟡 At Risk (1+ Days)</option><option value={3}>🟠 Warning (3+ Days)</option><option value={7}>🔴 Critical (7+ Days)</option><option value={14}>⚪ Dead (14+ Days)</option>
                </select>
              </StatCard>

              {/* WHAT-IF SLIDER */}
              <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative h-full flex flex-col justify-center">
                <div className="flex justify-between items-start mb-2 pr-10">
                  <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1 uppercase tracking-wider">
                    <Zap className="w-3 h-3" /> What-If
                  </p>
                </div>
                <div className="pr-10">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">+₹{((data.total_revenue * (conversionLift / 100)) / 100000).toFixed(1)} L</h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-1">If win rate improves by {conversionLift}%</p>
                </div>
                <input type="range" min="1" max="25" value={conversionLift} onChange={(e) => setConversionLift(e.target.value)} className="w-full mt-3 accent-indigo-600 relative z-10" />
              </div>
            </div>

            {/* CHARTS & AI TABLE */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* RESTORED: Funnel Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 xl:col-span-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900">Active Pipeline Funnel</h3>
                  <p className="text-xs text-slate-500 mt-1">Where are leads dropping off?</p>
                </div>
                <div className="flex-grow w-full min-h-[250px] xl:min-h-[400px]">
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

              {/* V3 AI Table */}
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden flex flex-col xl:col-span-2">
                <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/30">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{tableTitle}</h3>
                    <p className="text-xs text-slate-500 mt-1">Prescriptive view with AI Health Scoring and Next Best Actions.</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input type="text" placeholder="Search data..." className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none w-56 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-auto flex-grow max-h-[450px]">
                  <table className="w-full min-w-[1000px] text-sm text-left relative table-fixed">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                      <tr className="group">
                        <SortHeader label="Customer" sortKey="customer" />
                        <SortHeader label="Est. Revenue" sortKey="value" />
                        {/* NEW V3 FEATURE: Health & NBA */}
                        <SortHeader label="Health" sortKey="health_score" />
                        <th className="px-6 py-4 font-semibold text-indigo-600">⚡ Next Best Action (AI)</th>
                        <SortHeader label="Idle" sortKey="days_stagnant" alignRight />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!processedTableData || processedTableData.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-8 text-slate-500">No active deals found.</td></tr>
                      ) : (
                        processedTableData.map((lead) => (
                          <tr key={lead.id} className={`transition-colors group hover:bg-slate-50 border-l-4 ${lead.health_score < 40 ? 'border-l-rose-500' : lead.health_score < 70 ? 'border-l-amber-400' : 'border-l-emerald-400'}`}>
                            <td className="px-6 py-4 font-medium text-slate-900">{lead.customer} <div className="text-xs text-slate-400 font-normal mt-0.5">{lead.model} • {lead.stage}</div></td>
                            <td className="px-6 py-4 font-semibold text-slate-700">₹{(lead.value / 100000).toFixed(1)}L</td>
                            
                            {/* Health Bar */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                      <div className={`h-full rounded-full ${lead.health_score < 40 ? 'bg-rose-500' : lead.health_score < 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{width: `${lead.health_score}%`}}></div>
                                  </div>
                                  <span className={`text-xs font-bold ${lead.health_score < 40 ? 'text-rose-600' : lead.health_score < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{lead.health_score}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-indigo-700 bg-indigo-50/30">{lead.nba}</td>
                            <td className={`px-6 py-4 text-right font-bold text-slate-600`}>{lead.days_stagnant} d</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RESTORED: LEADERBOARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-900">Ranked Dealerships</h3>
                  </div>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button onClick={() => setBranchSort('revenue')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${branchSort === 'revenue' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>💰 Rev</button>
                    <button onClick={() => setBranchSort('units')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${branchSort === 'units' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>🚗 Units</button>
                    <button onClick={() => setBranchSort('avg_deal')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${branchSort === 'avg_deal' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>📊 Avg</button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
                  {!sortedBranches || sortedBranches.length === 0 ? (
                    <p className="text-sm text-slate-500">No data for selected timeframe.</p>
                  ) : (
                    sortedBranches.map((branch, index) => {
                      const fillPercentage = maxBranchMetric > 0 ? (branch[branchSort] / maxBranchMetric) * 100 : 0;
                      return (
                        <div key={index} className="relative overflow-hidden flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 z-0 group">
                          <div className="absolute top-0 left-0 h-full bg-amber-50/80 -z-10 transition-all duration-500" style={{ width: `${fillPercentage}%` }}></div>
                          
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${getBadgeStyle(index)}`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-medium text-slate-900 block">{branch.name}</span>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                {branchSort === 'avg_deal' ? `${branch.units} Cars Sold` : `Avg Deal: ₹${(branch.avg_deal / 100000).toFixed(1)}L`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {branchSort === 'revenue' && <span className="font-semibold text-amber-700 block">₹{(branch.revenue / 10000000).toFixed(2)} Cr</span>}
                            {branchSort === 'units' && <span className="font-semibold text-amber-700 block">{branch.units} <span className="text-[10px] text-amber-600/70">Cars</span></span>}
                            {branchSort === 'avg_deal' && <span className="font-semibold text-amber-700 block">₹{(branch.avg_deal / 100000).toFixed(1)} L</span>}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-semibold text-slate-900">Ranked Sales Reps</h3>
                  </div>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button onClick={() => setRepSort('revenue')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${repSort === 'revenue' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>💰 Rev</button>
                    <button onClick={() => setRepSort('units')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${repSort === 'units' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>🚗 Units</button>
                    <button onClick={() => setRepSort('avg_deal')} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${repSort === 'avg_deal' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>📊 Avg</button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
                  {!sortedReps || sortedReps.length === 0 ? (
                    <p className="text-sm text-slate-500">No reps found.</p>
                  ) : (
                    sortedReps.map((rep, index) => {
                      const fillPercentage = maxRepMetric > 0 ? (rep[repSort] / maxRepMetric) * 100 : 0;
                      return (
                        <div key={index} className="relative overflow-hidden flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 z-0 group">
                          <div className="absolute top-0 left-0 h-full bg-indigo-50/80 -z-10 transition-all duration-500" style={{ width: `${fillPercentage}%` }}></div>

                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${getBadgeStyle(index)}`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-medium text-slate-900 block">{rep.name}</span>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                {repSort === 'avg_deal' ? `${rep.units} Cars Sold` : `Avg Deal: ₹${(rep.avg_deal / 100000).toFixed(1)}L`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {repSort === 'revenue' && <span className="font-semibold text-indigo-600">₹{(rep.revenue / 100000).toFixed(1)} L</span>}
                            {repSort === 'units' && <span className="font-semibold text-indigo-600">{rep.units} <span className="text-[10px] text-indigo-400">Cars</span></span>}
                            {repSort === 'avg_deal' && <span className="font-semibold text-indigo-600">₹{(rep.avg_deal / 100000).toFixed(1)} L</span>}
                          </div>
                        </div>
                      )
                    })
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

function StatCard({ title, value, icon, subtitle, alert, tooltip, children }) {
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border transition-all h-full flex flex-col justify-center relative ${alert ? 'border-rose-200 ring-1 ring-rose-50' : 'border-slate-200'}`}>
      <div className="w-full pr-10">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          {tooltip && (
            <div tabIndex="0" className="relative group cursor-pointer focus:outline-none z-20">
              <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-focus:text-slate-500 transition-colors" />
              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-tight rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none shadow-xl normal-case font-normal tracking-normal">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {subtitle && <p className="text-[10px] font-medium text-slate-400 mt-1">{subtitle}</p>}
        {children}
      </div>
      <div className={`absolute top-5 right-5 p-2.5 rounded-xl ${alert ? 'bg-rose-50' : 'bg-slate-50'}`}>
        {icon}
      </div>
    </div>
  );
}