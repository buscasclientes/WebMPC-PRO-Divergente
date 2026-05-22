// ── History Screen (T-13) ────────────────────────────────────
import { useState, useEffect } from 'react'
import type { HistoryEntry, AIProvider } from '../../shared/types'

const PROVIDER_COLORS: Record<AIProvider, string> = {
  gemini: 'badge-blue',
  claude: 'badge-yellow',
  openai: 'badge-green',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function HistoryScreen() {
  const [history,  setHistory]  = useState<HistoryEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter,   setFilter]   = useState<AIProvider | 'all'>('all')

  useEffect(() => {
    chrome.storage.local.get('webmcp_history').then(r => {
      setHistory((r['webmcp_history'] as HistoryEntry[]) ?? [])
    })
    // Listener para actualizaciones en tiempo real
    const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes['webmcp_history']) {
        setHistory((changes['webmcp_history'].newValue as HistoryEntry[]) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [])

  async function clearHistory() {
    await chrome.storage.local.remove('webmcp_history')
    setHistory([])
  }

  const filtered = filter === 'all' ? history : history.filter(e => e.provider === filter)

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-200">Historial</h1>
          <p className="text-[11px] text-slate-500">{history.length} llamada{history.length !== 1 ? 's' : ''} registrada{history.length !== 1 ? 's' : ''}</p>
        </div>
        {history.length > 0 && (
          <button id="btn-clear-history" className="btn-danger py-1 px-2" onClick={clearHistory}>
            Limpiar
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 px-3 pb-2 shrink-0">
        {(['all', 'gemini', 'claude', 'openai'] as const).map(f => (
          <button
            key={f}
            className={`py-0.5 px-2 rounded text-[10px] font-medium border transition-all ${
              filter === f
                ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                : 'border-surface-600 text-slate-500 hover:text-slate-300'
            }`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-xs">
            <svg className="mx-auto mb-2 opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            Sin registros {filter !== 'all' ? `para ${filter}` : ''}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(entry => (
              <div key={entry.id} className="card-hover" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                <div className="flex items-start gap-2">
                  <span className={PROVIDER_COLORS[entry.provider] ?? 'badge-gray'}>{entry.provider}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{entry.prompt.slice(0, 60)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">{timeAgo(entry.timestamp)}</span>
                      {entry.tokensUsed > 0 && (
                        <span className="text-[10px] text-slate-600">{entry.tokensUsed.toLocaleString()} tok</span>
                      )}
                      {entry.durationMs > 0 && (
                        <span className="text-[10px] text-slate-600">{(entry.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>
                  <span className={entry.status === 'success' ? 'badge-green' : entry.status === 'error' ? 'badge-red' : 'badge-yellow'}>
                    {entry.status}
                  </span>
                </div>

                {expanded === entry.id && (
                  <div className="mt-2 flex flex-col gap-1.5 animate-fade-in">
                    <div>
                      <p className="section-title mb-0.5">Prompt</p>
                      <div className="code-block text-slate-400 max-h-20 text-[10px]">{entry.prompt}</div>
                    </div>
                    <div>
                      <p className="section-title mb-0.5">Respuesta</p>
                      <div className="code-block text-slate-300 max-h-28 text-[10px]">{entry.response}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
