import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Heart, Calendar, AlertTriangle, ListChecks, Play, RefreshCw } from 'lucide-react';

interface Asset {
  tag: string;
  name: string;
  system: string;
  criticality: 'High' | 'Medium' | 'Low';
  installDate: string;
  status: 'Running' | 'Standby' | 'Maintenance' | 'Offline';
  failureHistory?: Array<{
    date: string;
    description: string;
    downtimeHours: number;
    category: string;
    _id: string;
  }>;
  workOrders?: Array<{
    orderId: string;
    date: string;
    description: string;
    status: 'Open' | 'In Progress' | 'Completed';
    _id: string;
  }>;
}

interface RcaResponse {
  tag: string;
  name: string;
  system: string;
  healthScore: number;
  maintenanceAlert: 'Normal' | 'Warning' | 'Critical';
  ruleReason: string;
  rcaSummary: string;
  recommendations: string[];
}

export default function MaintenancePanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [rcaData, setRcaData] = useState<RcaResponse | null>(null);
  
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingRca, setLoadingRca] = useState(false);

  // Fetch asset tags list
  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        if (data.length > 0) {
          setSelectedTag(data[0].tag);
        }
      })
      .catch(err => console.error('Error fetching assets:', err));
  }, []);

  // Fetch single asset details and RCA
  const inspectAsset = async (tag: string) => {
    if (!tag) return;
    setLoadingAsset(true);
    setLoadingRca(true);
    setActiveAsset(null);
    setRcaData(null);

    try {
      // 1. Get asset details
      const assetRes = await fetch(`/api/assets/${tag}`);
      const assetData = await assetRes.json();
      setActiveAsset(assetData);
      setLoadingAsset(false);

      // 2. Get RCA analysis
      const rcaRes = await fetch(`/api/assets/${tag}/rca`);
      const rcaResult = await rcaRes.json();
      setRcaData(rcaResult);
    } catch (error) {
      console.error('Error fetching RCA details:', error);
    } finally {
      setLoadingAsset(false);
      setLoadingRca(false);
    }
  };

  useEffect(() => {
    if (selectedTag) {
      inspectAsset(selectedTag);
    }
  }, [selectedTag]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'text-industrial-accent-green bg-industrial-accent-green/10 border-industrial-accent-green/20';
      case 'Standby':
        return 'text-industrial-accent-blue bg-industrial-accent-blue/10 border-industrial-accent-blue/20';
      case 'Maintenance':
        return 'text-industrial-accent-amber bg-industrial-accent-amber/10 border-industrial-accent-amber/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getAlertColor = (alert: string) => {
    switch (alert) {
      case 'Critical':
        return 'text-industrial-accent-red border-industrial-accent-red bg-industrial-accent-red/5';
      case 'Warning':
        return 'text-industrial-accent-amber border-industrial-accent-amber bg-industrial-accent-amber/5';
      default:
        return 'text-industrial-accent-green border-industrial-accent-green bg-industrial-accent-green/5';
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden p-8 gap-8">
      {/* Sidebar Selector */}
      <div className="w-64 bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-4 flex flex-col h-full shrink-0">
        <label className="text-[10px] text-slate-500 font-mono block mb-2 uppercase tracking-wider">Select Equipment Asset</label>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {assets.map((asset) => (
            <button
              key={asset.tag}
              onClick={() => setSelectedTag(asset.tag)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-all border text-left ${
                selectedTag === asset.tag
                  ? 'bg-industrial-accent-blue/10 text-industrial-accent-blue border-industrial-accent-blue/30'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/30'
              }`}
            >
              <span>{asset.tag}</span>
              <span className="text-[10px] font-sans font-normal text-slate-500 truncate max-w-[120px]">
                {asset.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Inspection Board */}
      <div className="flex-1 flex flex-col overflow-y-auto gap-8 pr-2">
        {loadingAsset ? (
          <div className="flex-1 bg-industrial-bg-darker rounded-xl border border-industrial-border-dark flex items-center justify-center p-12">
            <div className="text-slate-500 font-mono text-xs flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-industrial-accent-blue" />
              Loading Asset telemetry data...
            </div>
          </div>
        ) : activeAsset ? (
          <div className="space-y-6">
            {/* Top Row: Basic Info & Health Score */}
            <div className="grid grid-cols-3 gap-6">
              {/* Asset Badge Card */}
              <div className="col-span-2 bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-bold text-slate-100">{activeAsset.tag}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(activeAsset.status)}`}>
                      {activeAsset.status.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-slate-300 mt-2">{activeAsset.name}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/60 mt-4 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    <span>Loop: {activeAsset.system}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Installed: {new Date(activeAsset.installDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Predictive Health score */}
              <div className="bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6 flex flex-col items-center justify-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Asset Health index</span>
                <div className="relative flex items-center justify-center">
                  <Heart className={`h-16 w-16 ${
                    rcaData && rcaData.healthScore < 60 ? 'text-industrial-accent-red' : (rcaData && rcaData.healthScore < 85 ? 'text-industrial-accent-amber' : 'text-industrial-accent-green')
                  }`} />
                  <span className="absolute text-sm font-bold font-mono text-slate-100">
                    {rcaData ? rcaData.healthScore : '--'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1">Rule-based predictive KPI</span>
              </div>
            </div>

            {/* Middle Row: AI RCA Panel */}
            <div className="bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6 space-y-6">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-industrial-accent-amber" />
                Reliability Diagnostics & AI-Generated RCA
              </h3>

              {/* Rule logic box */}
              {rcaData && (
                <div className={`p-4 border rounded-xl flex gap-3 text-xs leading-normal ${getAlertColor(rcaData.maintenanceAlert)}`}>
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block mb-0.5">
                      Predictive Severity Status: {rcaData.maintenanceAlert}
                    </span>
                    <span className="font-medium text-slate-300">{rcaData.ruleReason}</span>
                  </div>
                </div>
              )}

              {/* LLM generated content */}
              {loadingRca ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-800 rounded w-[95%]"></div>
                  </div>
                </div>
              ) : rcaData ? (
                <div className="grid grid-cols-5 gap-8">
                  <div className="col-span-3 space-y-3 text-left">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Failure Diagnostic Summary</h4>
                    <p className="text-xs text-slate-300 select-text font-mono leading-relaxed" dangerouslySetInnerHTML={{ __html: rcaData.rcaSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                  
                  <div className="col-span-2 space-y-3 text-left">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Corrective Recommendations</h4>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {rcaData.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-2 font-mono leading-normal">
                          <span className="text-industrial-accent-blue shrink-0">[{i+1}]</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Bottom Row: Failure logs & Work Orders */}
            <div className="grid grid-cols-2 gap-6">
              {/* Failure logs */}
              <div className="bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6">
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-industrial-accent-red" />
                  Historical Failure Logs ({activeAsset.failureHistory?.length || 0})
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
                  {(!activeAsset.failureHistory || activeAsset.failureHistory.length === 0) ? (
                    <div className="text-xs text-slate-500 py-6 text-center">No failure logs reported.</div>
                  ) : (
                    activeAsset.failureHistory.map((item) => (
                      <div key={item._id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-left text-xs font-mono">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700/60 uppercase">{item.category}</span>
                        </div>
                        <p className="text-slate-300 leading-normal">{item.description}</p>
                        <div className="text-[10px] text-industrial-accent-red font-bold mt-1">Downtime: {item.downtimeHours} hours</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Work Orders */}
              <div className="bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6">
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase flex items-center gap-2 mb-4">
                  <ListChecks className="h-4 w-4 text-industrial-accent-green" />
                  Outstanding Work Orders ({activeAsset.workOrders?.length || 0})
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
                  {(!activeAsset.workOrders || activeAsset.workOrders.length === 0) ? (
                    <div className="text-xs text-slate-500 py-6 text-center">No outstanding maintenance work orders.</div>
                  ) : (
                    activeAsset.workOrders.map((wo) => (
                      <div key={wo._id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-left text-xs font-mono">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                          <span>{wo.orderId}</span>
                          <span>{new Date(wo.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300 leading-normal mb-1">{wo.description}</p>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                          wo.status === 'Completed' ? 'bg-industrial-accent-green/10 text-industrial-accent-green border-industrial-accent-green/20' : 
                          (wo.status === 'In Progress' ? 'bg-industrial-accent-amber/10 text-industrial-accent-amber border-industrial-accent-amber/20' : 'bg-industrial-accent-red/10 text-industrial-accent-red border-industrial-accent-red/20')
                        }`}>
                          {wo.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">Asset not found.</div>
        )}
      </div>
    </div>
  );
}
