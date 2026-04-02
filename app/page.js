"use client";
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, Car, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/metrics')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => console.error("Error fetching metrics:", err));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-3xl font-bold tracking-tight">DealerPulse</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time Dealership Performance Dashboard</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={`₹${(data.total_revenue / 10000000).toFixed(2)} Cr`} icon={<IndianRupee className="text-emerald-600" />} />
          <StatCard title="Vehicles Delivered" value={data.total_deliveries} icon={<Car className="text-blue-600" />} />
          <StatCard title="Conversion Rate" value={`${data.conversion_rate}%`} icon={<TrendingUp className="text-indigo-600" />} />
          <StatCard title="Action Required" value={data.stagnant_leads.length} subtitle="Leads stuck > 7 days" icon={<AlertTriangle className="text-rose-600" />} alert />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-6">Revenue by Location (₹)</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.branch_performance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${(val / 10000000).toFixed(1)}Cr`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {data.branch_performance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#059669" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stagnant Leads Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Stagnant Leads (Bottlenecks)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Stage</th>
                    <th className="px-6 py-3">Sales Rep</th>
                    <th className="px-6 py-3">Days Stuck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.stagnant_leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{lead.customer}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{lead.stage}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.rep_name}</td>
                      <td className="px-6 py-4 text-rose-600 font-medium">{lead.days_stagnant} days</td>
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

function StatCard({ title, value, icon, subtitle, alert }) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${alert ? 'border-rose-200 ring-1 ring-rose-50' : 'border-gray-100'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${alert ? 'bg-rose-50' : 'bg-gray-50'}`}>{icon}</div>
      </div>
    </div>
  );
}
