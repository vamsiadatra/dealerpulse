"use client";
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, Car, AlertTriangle, Clock, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Added error state

  useEffect(() => {
    fetch('/api/metrics')
      .then(async (res) => {
        if (!res.ok) {
          // If the API crashes, catch the error text
          const text = await res.text();
          throw new Error(`API Error (${res.status}): ${text}`);
        }
        return res.json();
      })
      .then(json => {
        // Validate the data actually exists before setting it
        if (!json || typeof json.total_revenue === 'undefined') {
          throw new Error("Received invalid data format from the backend.");
        }
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // --- ERROR UI: Shows a clean error box instead of crashing ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-rose-100 max-w-lg w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Backend Connection Failed</h2>
          <p className="text-slate-500 text-sm mb-6">The React frontend is running perfectly, but it couldn't fetch the data from the Python API. Here is the exact error:</p>
          <div className="bg-slate-100 p-4 rounded-lg text-rose-600 text-xs text-left overflow-auto font-mono">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // --- LOADING UI ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 bg-indigo-600 rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium">Loading DealerPulse Insights...</p>
      </div>
    </div>
  );

  // --- MAIN DASHBOARD UI ---
  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans text-slate-900 selection:bg-indigo-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Car className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dealer<span className="text-indigo-600">Pulse</span></h1>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            Executive View
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Pipeline Health</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time performance metrics and active bottlenecks.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Total Revenue" value={`₹${(data.total_revenue / 10000000).toFixed(2)} Cr`} icon={<IndianRupee className="text-emerald-600 w-5 h-5" />} trend="+12%" />
          <StatCard title="Vehicles Delivered" value={data.total_deliveries} icon={<Car className="text-blue-600 w-5 h-5" />} trend="+4%" />
          <StatCard title="Conversion Rate" value={`${data.conversion_rate}%`} icon={<TrendingUp className="text-indigo-600 w-5 h-5" />} trend="-1.2%" />
          <StatCard title="Action Required" value={data.stagnant_leads.length} subtitle="Leads stuck > 7 days" icon={<AlertTriangle className="text-rose-600 w-5 h-5" />} alert />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 lg:col-span-1 flex flex-col">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-slate-900">Revenue by Location</h3>
              <p className="text-xs text-slate-500 mt-1">Top performing branches (₹)</p>
            </div>
            <div className="flex-grow w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.branch_performance} layout="vertical" margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(val) => `${(val / 10000000).toFixed(1)}Cr`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
                    {data.branch_performance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#4f46e5" : "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden lg:col-span-2 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Critical Bottlenecks</h3>
                <p className="text-xs text-slate-500 mt-1">Active leads with no movement in over a week.</p>
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
                  {data.stagnant_leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {lead.customer}
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{lead.model}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{lead.rep_name}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-rose-600 font-semibold">{lead.days_stagnant} days</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, alert, trend }) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border transition-all duration-200 hover:shadow-lg ${alert ? 'border-rose-200 ring-1 ring-rose-50' : 'border-slate-200 hover:border-indigo-100'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {trend && (
            <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> {trend} vs last month
            </p>
          )}
          {subtitle && <p className="text-xs font-medium text-rose-500 mt-2">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${alert ? 'bg-rose-50' : 'bg-slate-50'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
