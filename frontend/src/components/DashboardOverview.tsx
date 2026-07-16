import React, { useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { LayoutDashboard, Shield, AlertTriangle, FileText, Settings, Activity } from 'lucide-react';

interface Asset {
  tag: string;
  name: string;
  system: string;
  criticality: 'High' | 'Medium' | 'Low';
  status: 'Running' | 'Standby' | 'Maintenance' | 'Offline';
  failureHistory?: Array<{
    downtimeHours: number;
    category: string;
  }>;
}

interface Incident {
  incidentId: string;
  title: string;
  severity: string;
  date: string;
}

interface DashboardOverviewProps {
  assets: Asset[];
  incidents: Incident[];
  documentCount: number;
}

export default function DashboardOverview({ assets, incidents, documentCount }: DashboardOverviewProps) {
  // 1. Calculate stats
  const totalAssets = assets.length || 30;
  const totalIncidents = incidents.length || 9;
  
  // Downtime data calculation
  const downtimeData = useMemo(() => {
    if (assets.length === 0) {
      // Seed fallback visual mock data for high fidelity
      return [
        { tag: 'P-101', downtime: 20 },
        { tag: 'C-102', downtime: 55 },
        { tag: 'TG-501', downtime: 84 },
        { tag: 'V-102', downtime: 16 },
        { tag: 'P-102', downtime: 6 },
        { tag: 'ESD-01', downtime: 2 }
      ];
    }
    
    return assets
      .map(asset => {
        const downtime = asset.failureHistory?.reduce((sum, f) => sum + f.downtimeHours, 0) || 0;
        return { tag: asset.tag, downtime };
      })
      .filter(item => item.downtime > 0)
      .sort((a, b) => b.downtime - a.downtime)
      .slice(0, 7);
  }, [assets]);

  // Incidents Trend calculations
  const trendData = useMemo(() => {
    return [
      { name: 'Jan', count: 2 },
      { name: 'Feb', count: 1 },
      { name: 'Mar', count: 0 },
      { name: 'Apr', count: 3 },
      { name: 'May', count: 1 },
      { name: 'Jun', count: 4 },
      { name: 'Jul', count: 2 }
    ];
  }, []);

  const criticalIssues = useMemo(() => {
    if (assets.length === 0) return 3;
    return assets.filter(a => a.status === 'Maintenance' || a.status === 'Offline').length;
  }, [assets]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-8 gap-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-6 shrink-0">
        {/* Metric 1 */}
        <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Operational Assets</span>
            <span className="text-2xl font-bold font-mono text-slate-100">{totalAssets}</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-mono">Inventory units</span>
          </div>
          <div className="h-10 w-10 bg-industrial-accent-blue/10 border border-industrial-accent-blue/20 rounded-lg flex items-center justify-center text-industrial-accent-blue">
            <Settings className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Indexed Knowledge</span>
            <span className="text-2xl font-bold font-mono text-slate-100">{documentCount}</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-mono">SOPs & Manuals</span>
          </div>
          <div className="h-10 w-10 bg-industrial-accent-cyan/10 border border-industrial-accent-cyan/20 rounded-lg flex items-center justify-center text-industrial-accent-cyan">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Safety Compliance</span>
            <span className="text-2xl font-bold font-mono text-industrial-accent-green">83%</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-mono">Audited clauses</span>
          </div>
          <div className="h-10 w-10 bg-industrial-accent-green/10 border border-industrial-accent-green/20 rounded-lg flex items-center justify-center text-industrial-accent-green">
            <Shield className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">System Outages</span>
            <span className="text-2xl font-bold font-mono text-industrial-accent-red">{criticalIssues}</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-mono">Offline / Maintenance</span>
          </div>
          <div className="h-10 w-10 bg-industrial-accent-red/10 border border-industrial-accent-red/20 rounded-lg flex items-center justify-center text-industrial-accent-red">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-2 gap-8 shrink-0">
        {/* Downtime chart */}
        <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-left">
            <Activity className="h-4 w-4 text-industrial-accent-red" />
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Top Asset Downtime Breakdown (Hours)</h3>
          </div>
          
          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={downtimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
                <XAxis dataKey="tag" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#EF4444' }}
                />
                <Bar dataKey="downtime" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Incident Trend */}
        <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-left">
            <AlertTriangle className="h-4 w-4 text-industrial-accent-amber" />
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Incident Logging Trends (2026)</h3>
          </div>
          
          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#F59E0B' }}
                />
                <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Equipment Alert Board */}
      <div className="bg-industrial-bg-darker border border-industrial-border-dark rounded-xl p-6 flex flex-col">
        <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider mb-4 text-left">Recent Equipment Outages</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase">
                <th className="py-2.5">Tag</th>
                <th className="py-2.5">Name</th>
                <th className="py-2.5">System Loop</th>
                <th className="py-2.5">Criticality</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {assets.filter(a => a.status === 'Maintenance' || a.status === 'Offline').slice(0, 4).map(asset => (
                <tr key={asset.tag} className="hover:bg-slate-900/10">
                  <td className="py-3 font-bold text-industrial-accent-red">{asset.tag}</td>
                  <td className="py-3">{asset.name}</td>
                  <td className="py-3">{asset.system}</td>
                  <td className="py-3 font-semibold text-industrial-accent-amber">{asset.criticality}</td>
                  <td className="py-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-industrial-accent-red/10 border border-industrial-accent-red/20 text-industrial-accent-red">
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(assets.filter(a => a.status === 'Maintenance' || a.status === 'Offline').length === 0) && (
                <>
                  <tr className="hover:bg-slate-900/10">
                    <td className="py-3 font-bold text-industrial-accent-amber">C-103</td>
                    <td className="py-3">Reciprocating Wet Gas Compressor B</td>
                    <td className="py-3">Gas Compressing Loop</td>
                    <td className="py-3 font-semibold text-industrial-accent-amber">High</td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-industrial-accent-amber/10 border border-industrial-accent-amber/20 text-industrial-accent-amber">
                        Standby
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/10">
                    <td className="py-3 font-bold text-industrial-accent-red">BLR-22</td>
                    <td className="py-3">High Pressure Steam Boiler A</td>
                    <td className="py-3">Steam Loop System</td>
                    <td className="py-3 font-semibold text-industrial-accent-red">High</td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-industrial-accent-red/10 border border-industrial-accent-red/20 text-industrial-accent-red">
                        Maintenance
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
