// ── Inspector Screen (T-10) ──────────────────────────────────
// Editor de prompts + envío a IA + visualizador de respuesta
import type { AIProvider, PageContext } from '../../shared/types'

const PROVIDERS: { id: AIProvider; label: string; color: string }[] = [
  { id: 'gemini', label: 'Gemini', color: 'text-blue-400' },
  { id: 'claude', label: 'Claude', color: 'text-amber-400' },
  { id: 'openai', label: 'OpenAI', color: 'text-emerald-400' },
]

interface InspectorScreenProps {
  provider: AIProvider
  setProvider: (p: AIProvider) => void
  prompt: string
  setPrompt: (p: string) => void
  response: string
  setResponse: (r: string) => void
  context: PageContext | null
  setContext: (ctx: PageContext | null) => void
  status: 'idle' | 'loading' | 'success' | 'error'
  tokensUsed: number | null
  elapsed: number | null
  runPrompt: () => Promise<void>
  onCapturePage: () => Promise<PageContext | null>
}

export default function InspectorScreen({
  provider,
  setProvider,
  prompt,
  setPrompt,
  response,
  setResponse,
  context,
  setContext,
  status,
  tokensUsed,
  elapsed,
  runPrompt,
  onCapturePage,
}: InspectorScreenProps) {

  async function handleCaptureContext() {
    await onCapturePage()
  }

  return (
    <div className="flex flex-col gap-3 p-3 animate-slide-up">
      {/* Provider selector */}
      <div>
        <p className="section-title">Proveedor</p>
        <div className="flex gap-1">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              id={`provider-${p.id}`}
              onClick={() => setProvider(p.id)}
              className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all duration-150 ${provider === p.id
                  ? `border-primary-500 bg-primary-600/20 ${p.color}`
                  : 'border-surface-500 bg-surface-700 text-slate-500 hover:text-slate-300'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contexto capturado */}
      {context && (
        <div className="card flex items-start gap-2 animate-fade-in">
          <span className="dot-connected mt-1 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-primary-400 font-medium truncate">{context.title}</p>
            <p className="text-[10px] text-slate-500 truncate">{context.url}</p>
          </div>
          <button className="btn-ghost py-0.5 px-1.5 ml-auto text-[10px]" onClick={() => setContext(null)}>✕</button>
        </div>
      )}

      {/* Prompt editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="section-title mb-0">Prompt</p>
          <button
            id="btn-capture-ctx"
            className="btn-ghost py-0.5 px-2 text-[10px]"
            onClick={handleCaptureContext}
          >
            + Contexto página
          </button>
        </div>
        <textarea
          id="prompt-editor"
          className="textarea h-28"
          placeholder="Escribe tu prompt aquí…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') runPrompt() }}
        />
        <p className="text-[10px] text-slate-600 mt-0.5">Ctrl+Enter para enviar</p>
      </div>

      {/* Run button */}
      <button
        id="btn-run-prompt"
        className="btn-primary w-full justify-center py-2"
        onClick={runPrompt}
        disabled={status === 'loading' || !prompt.trim()}
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            Procesando…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Enviar Prompt
          </>
        )}
      </button>

      {/* Response */}
      {response && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-1">
            <p className="section-title mb-0">Respuesta</p>
            <div className="flex items-center gap-2">
              {tokensUsed !== null && (
                <span className="badge-blue">{tokensUsed.toLocaleString()} tokens</span>
              )}
              {elapsed !== null && (
                <span className="badge-gray">{(elapsed / 1000).toFixed(1)}s</span>
              )}
              {status === 'success' && <span className="badge-green">OK</span>}
              {status === 'error' && <span className="badge-red">Error</span>}
            </div>
          </div>
          <div className="code-block max-h-64 text-slate-300">
            {response}
          </div>
          <button
            className="btn-ghost mt-1 w-full justify-center text-[10px]"
            onClick={() => {
              navigator.clipboard.writeText(response)
              setResponse(response) // No-op to avoid TS warnings or update state
            }}
          >
            Copiar respuesta
          </button>
        </div>
      )}
    </div>
  )
}
