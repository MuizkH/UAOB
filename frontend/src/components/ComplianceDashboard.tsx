import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileDown, AlertTriangle, CheckCircle, Clock, CheckSquare } from 'lucide-react';

interface ComplianceItem {
  id: string;
  authority: string;
  clause: string;
  requirement: string;
  procedureRef: string;
  status: 'Compliant' | 'Partial' | 'Non-Compliant';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  gapSummary: string;
  lastAudited: string;
}

export default function ComplianceDashboard() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/compliance')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error('Error fetching compliance items:', err));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/compliance/export', {
        method: 'POST'
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_evidence_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading evidence package:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'bg-industrial-accent-green/10 border-industrial-accent-green/20 text-industrial-accent-green';
      case 'Partial':
        return 'bg-industrial-accent-amber/10 border-industrial-accent-amber/20 text-industrial-accent-amber';
      default:
        return 'bg-industrial-accent-red/10 border-industrial-accent-red/20 text-industrial-accent-red';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'text-industrial-accent-red font-bold';
      case 'High':
        return 'text-industrial-accent-amber font-semibold';
      case 'Medium':
        return 'text-slate-300';
      default:
        return 'text-slate-400';
    }
  };

  const compliantCount = items.filter(c => c.status === 'Compliant').length;
  const complianceRate = items.length > 0 ? Math.round((compliantCount / items.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-8 gap-8">
      {/* Top Banner and Scorecard */}
      <div className="grid grid-cols-4 gap-6 shrink-0">
        <div className="col-span-3 bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-slate-300 mb-2 flex items-center gap-2">
              <ShieldCheck className="text-industrial-accent-green h-4 w-4" />
              Statutory Compliance & Audit Dashboard
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Cross-references operational plant logs, SOP executions, and maintenance files against national regulatory standards, including OISD (Oil Industry Safety Directorate), the Indian Factory Act 1948, and PESO rules.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-800/60 mt-4 flex gap-6 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-industrial-accent-green" /> Compliant: {compliantCount}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-industrial-accent-amber" /> Gaps: {items.filter(c => c.status === 'Partial').length}</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-industrial-accent-red" /> Breach: {items.filter(c => c.status === 'Non-Compliant').length}</span>
          </div>
        </div>

        {/* Big Score Card */}
        <div className="bg-industrial-bg-darker rounded-xl border border-industrial-border-dark p-6 flex flex-col items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center">Safety Compliance Index</span>
          <div className="text-4xl font-extrabold font-mono text-industrial-accent-green">{complianceRate}%</div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full mt-3 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-industrial-accent-cyan" />
            {exporting ? 'EXPORTING...' : 'EXPORT EVIDENCE'}
          </button>
        </div>
      </div>

      {/* Grid Compliance Checklist */}
      <div className="bg-industrial-bg-darker rounded-xl border border-industrial-border-dark overflow-hidden flex flex-col">
        <div className="p-4 border-b border-industrial-border-dark flex items-center justify-between bg-slate-950/20">
          <span className="text-xs font-bold font-mono text-slate-300 uppercase flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-industrial-accent-cyan" />
            Statutory Rule Matrix
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-mono tracking-wider bg-slate-950/30">
                <th className="py-3.5 px-6 font-semibold">Clause ID</th>
                <th className="py-3.5 px-4 font-semibold">Standard / Agency</th>
                <th className="py-3.5 px-4 font-semibold">Statutory Clause</th>
                <th className="py-3.5 px-4 font-semibold">Severity</th>
                <th className="py-3.5 px-4 font-semibold">SOP Procedure</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-6 font-semibold">Audit Finding / Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs text-slate-300">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/10 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-400">{item.id}</td>
                  <td className="py-4 px-4 font-semibold">{item.authority}</td>
                  <td className="py-4 px-4 font-medium text-slate-200" title={item.requirement}>
                    <div className="truncate max-w-[200px]">{item.clause}</div>
                  </td>
                  <td className={`py-4 px-4 ${getSeverityColor(item.severity)}`}>{item.severity}</td>
                  <td className="py-4 px-4 text-slate-400 underline">{item.procedureRef}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400 select-text max-w-sm break-words leading-normal font-sans">
                    {item.gapSummary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
