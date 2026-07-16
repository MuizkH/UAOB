import React from 'react';
import { Shield, User, FileText, Database, Key } from 'lucide-react';

interface HeaderProps {
  userRole: string;
  setUserRole: (role: string) => void;
  documentCount: number;
  dbStatus: boolean;
  aiStatus: boolean;
}

export default function Header({ userRole, setUserRole, documentCount, dbStatus, aiStatus }: HeaderProps) {
  const roles = [
    { value: 'Engineer', label: 'Plant Engineer', color: 'border-industrial-accent-blue/40 text-industrial-accent-blue' },
    { value: 'Maintenance Lead', label: 'Maintenance Lead', color: 'border-industrial-accent-amber/40 text-industrial-accent-amber' },
    { value: 'Compliance Officer', label: 'Compliance Officer', color: 'border-industrial-accent-cyan/40 text-industrial-accent-cyan' }
  ];

  return (
    <header className="h-16 bg-industrial-bg-darker border-b border-industrial-border-dark flex items-center justify-between px-8 shrink-0">
      {/* Search / Context Info */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-industrial-border-dark text-[12px] font-mono text-slate-300">
          <Database className={`h-3.5 w-3.5 ${dbStatus ? 'text-industrial-accent-green' : 'text-industrial-accent-red animate-pulse'}`} />
          <span>DB: {dbStatus ? 'Connected' : 'Offline'}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-industrial-border-dark text-[12px] font-mono text-slate-300">
          <Key className={`h-3.5 w-3.5 ${aiStatus ? 'text-industrial-accent-green' : 'text-industrial-accent-amber animate-pulse'}`} />
          <span>Gemini: {aiStatus ? 'Active' : 'Offline / Mock'}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-industrial-border-dark text-[12px] font-mono text-slate-300">
          <FileText className="h-3.5 w-3.5 text-industrial-accent-cyan" />
          <span>Indexed Corpus: <strong className="text-slate-100">{documentCount} Docs</strong></span>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Role Filter:</span>
          <div className="flex items-center bg-slate-900/60 p-0.5 rounded-lg border border-industrial-border-dark">
            {roles.map(r => (
              <button
                key={r.value}
                onClick={() => setUserRole(r.value)}
                className={`px-3 py-1 text-[11px] font-mono font-medium rounded-md transition-all ${
                  userRole === r.value 
                    ? 'bg-slate-800 text-slate-100 border border-slate-700/60 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-8 w-px bg-industrial-border-dark"></div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-industrial-border-dark flex items-center justify-center text-slate-300">
            <User className="h-4 w-4" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-semibold text-slate-200">Terminal #09</div>
            <div className="text-[10px] text-slate-500 font-mono">OPERATOR_ID: 9812-ET</div>
          </div>
        </div>
      </div>
    </header>
  );
}
