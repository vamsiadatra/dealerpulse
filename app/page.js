"use client";
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, Car, AlertTriangle, Clock, Filter, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter States
  const [branchFilter, setBranchFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/metrics?branch_id=${branchFilter}&timeframe=${timeFilter}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [branchFilter, timeFilter]);

  // Fetch data whenever a filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-rose-100 max-w-lg w-full text-center text-rose-600 font-mono text-sm">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans text-slate-900 selection:bg-indigo-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg"><Car className="text-white w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight">Dealer<span className="text-indigo-600">Pulse</span></h1>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">Executive View</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Header & Interactive Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Pipeline Health</h2>
            <p className="text-sm text-slate-500 mt-1">Filter by branch and timeframe to drill down into performance.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">All Branches</option>
                {data?.filters?.branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select 
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="90">Last 90 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && <div className="h-1 bg-indigo-500 animate-pulse rounded-full w-full"></div>}

        {/* KPI Cards */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard title="Total Revenue" value={`₹${(data.total_revenue / 10000000).toFixed(2)} Cr`} icon={<IndianRupee className="text-emerald-600 w-5 h-5" />} />
              <StatCard title="Vehicles Delivered" value={data.total_deliveries} icon={<Car className="text-blue-600 w-5 h-5" />} />
              <StatCard title="Conversion Rate" value={`${data.conversion_rate}%`} icon={<TrendingUp className="text-indigo-600 w-5 h-5" />} />
              <StatCard title="Action Required" value={data.stagnant_leads.length} subtitle="Leads stuck > 7 days" icon={<AlertTriangle className="text-rose-600 w-5 h-5" />} alert />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Funnel/Pipeline Chart (New Feature!) */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 lg:col-span-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900">Active Pipeline Funnel</h3>
                  <p className="text-xs text-slate-500 mt-1">Current volume of active leads per stage</p>
                </div>
                <div className="flex-grow w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pipeline_funnel} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                        {data.pipeline_funnel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#6366f1" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Critical Bottlenecks Table */}
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden lg:col-span-2 flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Critical Bottlenecks</h3>
                    <p className="text-xs text-slate-500 mt-1">Leads with no movement in over a week.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-rose-100">
                    <Clock className="w-3.5 h-3.5" /> High Priority
                  </span>
                </div>
                <div className="overflow-x-auto flex-grow">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Current Stage</th>
                        <th className="px-6 py-4">Assigned Rep</th>
                        <th className="px-6 py-4 text-right">Time Stuck</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.stagnant_leads.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-8 text-slate-500">No stagnant leads found. Great job!</td></tr>
                      ) : (
                        data.stagnant_leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{lead.customer} <div className="text-xs text-slate-400 font-normal">{lead.model}</div></td>
                            <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">{lead.stage}</span></td>
                            <td className="px-6 py-4 text-slate-600">{lead.rep_name}</td>
                            <td className="px-6 py-4 text-right font-semibold text-rose-600">{lead.days_stagnant} days</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
    <div className={`bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border transition-all ${alert ? 'border-rose-200 ring-1 ring-rose-50' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs font-medium text-rose-500 mt-2">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${alert ? 'bg-rose-50' : 'bg-slate-50'}`}>{icon}</div>
      </div>
    </div>
  );
}
