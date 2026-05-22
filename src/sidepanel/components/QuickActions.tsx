// ── QuickActions (T-14) ──────────────────────────────────────
import { useState } from 'react'
import type { PageContext } from '../../shared/types'

export default function QuickActions() {
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState('')

  async function captureContext() {
    setLoading(true)
    setStatus('Capturando contexto…')
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT', payload: null })
      const ctx = response?.payload as PageContext | null
      if (ctx) {
        setStatus(`✓ ${ctx.title.slice(0, 30)}…`)
      } else {
        setStatus('⚠ Sin contexto')
      }
    } catch {
      setStatus('✗ Error')
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(''), 3000)
    }
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-800 border-b border-surface-700 shrink-0">
      <span className="section-title mb-0 mr-1">Acciones</span>

      <button
        id="qa-capture"
        className="btn-ghost py-1 px-2 text-[10px]"
        onClick={captureContext}
        disabled={loading}
        title="Capturar contexto de la pestaña activa"
      >
        {loading ? (
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        )}
        Página
      </button>

      <button
        id="qa-selection"
        className="btn-ghost py-1 px-2 text-[10px]"
        title="Usar texto seleccionado en el Inspector"
        onClick={() => setStatus('✓ Selección lista')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        Selección
      </button>

      <button
        id="qa-clear"
        className="btn-ghost py-1 px-2 text-[10px]"
        title="Limpiar el área de trabajo"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Limpiar
      </button>

      {status && (
        <span className="ml-auto text-[10px] text-primary-400 animate-fade-in truncate max-w-[100px]">
          {status}
        </span>
      )}
    </div>
  )
}
