import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  UploadCloud 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'copilot', label: 'Expert Copilot', icon: MessageSquare },
    { id: 'assets', label: 'Equipment & RCA', icon: Settings },
    { id: 'compliance', label: 'Compliance Gaps', icon: ShieldCheck },
    { id: 'lessons', label: 'Lessons Learned', icon: AlertTriangle },
    { id: 'documents', label: 'Document Vault', icon: UploadCloud },
  ];

  return (
    <aside className="w-64 bg-industrial-bg-darker border-r border-industrial-border-dark flex flex-col h-full shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-industrial-border-dark flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-industrial-accent-blue/10 flex items-center justify-center border border-industrial-accent-blue/30 text-industrial-accent-blue font-mono font-bold text-lg">
          Ω
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-slate-100 font-mono">OPERA-BRAIN</h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight">ET-AI HACKATHON 2026</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-industrial-accent-blue/10 text-industrial-accent-blue border border-industrial-accent-blue/20'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-industrial-accent-blue' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Legal / Version */}
      <div className="p-4 border-t border-industrial-border-dark">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Status:</span>
            <span className="flex items-center gap-1.5 text-industrial-accent-green font-bold">
              <span className="h-2 w-2 rounded-full bg-industrial-accent-green animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-1 text-center">
            SYS v2.4.0-PROTOTYPE
          </div>
        </div>
      </div>
    </aside>
  );
}
