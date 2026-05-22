import { useState } from 'react'
import InspectorScreen   from './components/InspectorScreen'
import ConfigScreen      from './components/ConfigScreen'
import AgentsScreen      from './components/AgentsScreen'
import HistoryScreen     from './components/HistoryScreen'
import QuickActions      from './components/QuickActions'

// ── Iconos SVG inline (sin dependencias externas) ────────────
const IconInspect = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    <path d="M11 8v6M8 11h6"/>
  </svg>
)
const IconAgents = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="6" height="6" x="2" y="2" rx="1"/><rect width="6" height="6" x="16" y="2" rx="1"/>
    <rect width="6" height="6" x="9" y="16" rx="1"/>
    <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M12 13v3"/>
  </svg>
)
const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
)
const IconConfig = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

type Tab = 'inspector' | 'agents' | 'history' | 'config'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'inspector', label: 'Inspector', icon: <IconInspect /> },
  { id: 'agents',    label: 'Agentes',   icon: <IconAgents />  },
  { id: 'history',   label: 'Historial', icon: <IconHistory /> },
  { id: 'config',    label: 'Config',    icon: <IconConfig />  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inspector')

  return (
    <div className="flex flex-col h-full bg-surface-900 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 py-2 bg-surface-800 border-b border-surface-600 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <span className="font-semibold text-slate-200 text-xs tracking-wide">WebMCP</span>
          <span className="badge-blue">MCP</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="dot-connected" title="Extension activa" />
          <span className="text-[10px] text-slate-500 ml-1">v1.0</span>
        </div>
      </header>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <QuickActions />

      {/* ── Contenido principal ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto animate-fade-in">
        {activeTab === 'inspector' && <InspectorScreen />}
        {activeTab === 'agents'    && <AgentsScreen />}
        {activeTab === 'history'   && <HistoryScreen />}
        {activeTab === 'config'    && <ConfigScreen />}
      </main>

      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <nav className="flex border-t border-surface-600 bg-surface-800 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-item flex-1 ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
