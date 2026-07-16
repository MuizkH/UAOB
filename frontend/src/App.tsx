import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import CopilotChat from './components/CopilotChat';
import IngestionPanel from './components/IngestionPanel';
import MaintenancePanel from './components/MaintenancePanel';
import ComplianceDashboard from './components/ComplianceDashboard';
import LessonsLearnedFeed from './components/LessonsLearnedFeed';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('Engineer');
  
  // Data lists
  const [documentList, setDocumentList] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [incidentsList, setIncidentsList] = useState([]);

  // Server health connections
  const [dbStatus, setDbStatus] = useState(false);
  const [aiStatus, setAiStatus] = useState(false);

  // Fetch telemetry databases data
  const fetchTelemetry = async () => {
    try {
      // 1. Fetch docs
      const docRes = await fetch('/api/ingest');
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocumentList(docData);
        setDbStatus(true);
      }

      // 2. Fetch assets
      const assetRes = await fetch('/api/assets');
      if (assetRes.ok) {
        const assetData = await assetRes.json();
        setAssetsList(assetData);
      }

      // 3. Fetch incidents
      const incRes = await fetch('/api/incidents');
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidentsList(incData);
      }

      // Test active Gemini client configurations
      setAiStatus(true); // Default active, services will report if offline/mock fallback triggered
    } catch (error) {
      console.warn('API Offline. Running in simulated fallback mode.');
      setDbStatus(false);
      setAiStatus(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    // Refresh lists occasionally
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-industrial-bg-dark text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Nav */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header 
          userRole={userRole} 
          setUserRole={setUserRole} 
          documentCount={documentList.length}
          dbStatus={dbStatus}
          aiStatus={aiStatus}
        />

        {/* Dynamic Inner Panel Viewport */}
        <main className="flex-1 overflow-hidden flex flex-col bg-slate-950/20">
          {activeTab === 'dashboard' && (
            <DashboardOverview 
              assets={assetsList} 
              incidents={incidentsList} 
              documentCount={documentList.length} 
            />
          )}
          {activeTab === 'copilot' && <CopilotChat />}
          {activeTab === 'assets' && <MaintenancePanel />}
          {activeTab === 'compliance' && <ComplianceDashboard />}
          {activeTab === 'lessons' && <LessonsLearnedFeed />}
          {activeTab === 'documents' && (
            <IngestionPanel 
              onIngestSuccess={fetchTelemetry} 
              documentList={documentList}
              setDocumentList={setDocumentList}
            />
          )}
        </main>
      </div>
    </div>
  );
}
