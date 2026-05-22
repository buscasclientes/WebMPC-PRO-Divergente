import { useState, useEffect } from 'react'
import { getDebugEntries, clearDebugEntries, formatDebugTimestamp, DebugEntry } from '../../shared/debug'

export default function DebugPanel() {
  const [entries, setEntries] = useState<DebugEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<DebugEntry | null>(null)

  const loadEntries = async () => {
    const data = await getDebugEntries()
    setEntries(data)
  }

  useEffect(() => {
    loadEntries()
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes['webmcp_debug_logs']) {
        setEntries((changes['webmcp_debug_logs'].newValue as DebugEntry[]) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const handleClear = async () => {
    await clearDebugEntries()
    setEntries([])
    setSelectedEntry(null)
  }

  return (
    <div className="flex flex-col h-full bg-surface-900 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-surface-600 bg-surface-800 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-200">Modo Debug Log</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Muestra transacciones en tiempo real con API Keys enmascaradas.</p>
        </div>
        <button
          id="btn-clear-debug"
          className="btn-danger py-1 px-2.5 text-[10px]"
          onClick={handleClear}
          disabled={entries.length === 0}
        >
          Limpiar
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs py-8">
            <svg className="mb-2 opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            No hay trazas en el log de debug
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {entries.map(entry => {
              const isSelected = selectedEntry?.id === entry.id
              const hasError = !!entry.error
              const badgeClass = entry.type === 'api' ? 'badge-blue' : 'badge-yellow'
              
              return (
                <div
                  key={entry.id}
                  className={`card cursor-pointer border transition-all duration-150 ${
                    isSelected ? 'border-primary-500 bg-surface-700/50' : 'border-surface-600 hover:border-surface-500 bg-surface-800'
                  }`}
                  onClick={() => setSelectedEntry(isSelected ? null : entry)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={badgeClass}>{entry.type}</span>
                      {entry.provider && <span className="text-[10px] font-medium text-slate-300 capitalize">{entry.provider}</span>}
                      {entry.tool && <span className="text-[10px] font-mono text-primary-300 truncate">{entry.tool}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono">{formatDebugTimestamp(entry.timestamp)}</span>
                      {entry.statusCode && (
                        <span className={`text-[10px] font-semibold ${entry.statusCode >= 200 && entry.statusCode < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.statusCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono truncate mb-1">
                    {entry.requestUrl || (entry.tool ? `tool: ${entry.tool}` : 'Llamada local')}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-surface-700/50">
                    <span>Latencia: {entry.duration_ms}ms</span>
                    {hasError && <span className="text-red-400 font-medium">⚠ Error</span>}
                  </div>

                  {/* Expanded JSON details */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-surface-600 flex flex-col gap-2.5 animate-fade-in" onClick={e => e.stopPropagation()}>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Request:</div>
                        <pre className="code-block text-[10px] max-h-36 overflow-y-auto">
                          {JSON.stringify(entry.requestBody, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Response:</div>
                        <pre className="code-block text-[10px] max-h-36 overflow-y-auto">
                          {JSON.stringify(entry.responseBody, null, 2)}
                        </pre>
                      </div>
                      {entry.error && (
                        <div className="p-2 rounded bg-red-950/20 border border-red-500/20 text-[10px] text-red-400 font-mono whitespace-pre-wrap">
                          <strong>Error:</strong> {entry.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
