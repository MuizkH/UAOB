import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lightbulb, Users, Calendar, ShieldCheck, Info, Sparkles } from 'lucide-react';

interface Incident {
  incidentId: string;
  title: string;
  date: string;
  equipmentTag: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  rootCause: string;
  actionTaken: string;
  lessonsLearned: string;
  reportedBy: string;
}

interface PatternAlert {
  patternId: string;
  title: string;
  affectedAssets: string[];
  confidence: number;
  incidentCount: number;
  patternSummary: string;
  remediation: string;
  relatedIncidents: string[];
}

export default function LessonsLearnedFeed() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patterns, setPatterns] = useState<PatternAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const incRes = await fetch('/api/incidents');
      const incData = await incRes.json();
      setIncidents(incData);

      const patRes = await fetch('/api/incidents/patterns');
      const patData = await patRes.json();
      setPatterns(patData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'bg-industrial-accent-red/10 border-industrial-accent-red/20 text-industrial-accent-red';
      case 'High':
        return 'bg-industrial-accent-amber/10 border-industrial-accent-amber/20 text-industrial-accent-amber';
      case 'Medium':
        return 'bg-industrial-accent-blue/10 border-industrial-accent-blue/20 text-industrial-accent-blue';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden p-8 gap-8">
      {/* AI patterns cluster alerts */}
      <div className="w-1/2 flex flex-col gap-6 overflow-y-auto">
        <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-slate-300 flex items-center gap-2 mb-1 shrink-0">
          <Sparkles className="text-industrial-accent-amber h-4 w-4 animate-pulse" />
          AI-Surfaced Recurring Failures
        </h2>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-800/40 rounded-xl border border-slate-800"></div>
            <div className="h-28 bg-slate-800/40 rounded-xl border border-slate-800"></div>
          </div>
        ) : patterns.length === 0 ? (
          <div className="p-8 bg-industrial-bg-darker border border-industrial-border-dark rounded-xl text-center text-xs text-slate-500 font-mono">
            No active alerts detected. Seed dataset to scan incident overlaps.
          </div>
        ) : (
          patterns.map((pat) => (
            <div 
              key={pat.patternId} 
              className="bg-industrial-bg-darker border border-industrial-accent-amber/20 hover:border-industrial-accent-amber/40 rounded-xl p-5 space-y-4 text-left transition-all hover:shadow-lg glow-active"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-industrial-accent-amber/10 border border-industrial-accent-amber/30 flex items-center justify-center text-industrial-accent-amber shrink-0">
                    <AlertTriangle className="h-4 w-4 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-mono text-slate-200 uppercase leading-snug">{pat.title}</h3>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Pattern Match: <strong className="text-industrial-accent-amber">{pat.confidence}% Confidence</strong>
                    </div>
                  </div>
                </div>
                <span className="bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold px-2 py-0.5 rounded">
                  {pat.incidentCount} incidents
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs text-slate-300">
                <p className="leading-relaxed font-sans text-slate-400">
                  {pat.patternSummary}
                </p>

                <div className="grid grid-cols-2 gap-4 text-[10px] pt-1">
                  <div>
                    <span className="text-slate-500 uppercase block mb-1">Affected Assets</span>
                    <div className="flex flex-wrap gap-1">
                      {pat.affectedAssets.map((asset) => (
                        <span key={asset} className="bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block mb-1">Related Logs</span>
                    <div className="flex flex-wrap gap-1">
                      {pat.relatedIncidents.map((id) => (
                        <span key={id} className="bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-industrial-accent-blue/5 border border-industrial-accent-blue/15 rounded-lg flex gap-2">
                  <Lightbulb className="h-4 w-4 text-industrial-accent-blue shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Recommended Remediation Action</span>
                    <span className="text-[11px] text-slate-300 leading-normal font-sans">{pat.remediation}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incident logs list */}
      <div className="w-1/2 bg-industrial-bg-darker border border-industrial-border-dark rounded-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-industrial-border-dark">
          <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-slate-300 flex items-center gap-2">
            <Info className="h-4 w-4 text-industrial-accent-cyan" />
            Active Near-Miss & Incident Logs ({incidents.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-4 space-y-4">
          {incidents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">No incidents found in the database.</div>
          ) : (
            incidents.map((inc) => (
              <div key={inc.incidentId} className="p-4 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-slate-400">{inc.incidentId}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border uppercase ${getSeverityStyle(inc.severity)}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(inc.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200 select-all font-mono">{inc.title}</h3>
                  <div className="text-[10px] font-mono text-slate-500">
                    Asset Tag: <span className="text-slate-300">{inc.equipmentTag}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed select-text font-mono">
                  {inc.description}
                </p>

                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono border-t border-slate-800/60 pt-2.5 mt-2 text-left">
                  <div>
                    <span className="text-slate-500 uppercase block mb-1">Root Cause Diagnosis</span>
                    <span className="text-slate-300 leading-relaxed font-sans select-text">{inc.rootCause}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block mb-1">Lessons Learned Summary</span>
                    <span className="text-slate-300 leading-relaxed font-sans select-text">{inc.lessonsLearned}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono border-t border-slate-800/30 pt-2">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Reported By: {inc.reportedBy}</span>
                  <span className="flex items-center gap-1 text-industrial-accent-green font-bold"><ShieldCheck className="h-3 w-3" /> Action Complete: {inc.actionTaken.slice(0, 20)}...</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
