// ── Inspector Screen (T-10) ──────────────────────────────────
// Editor de prompts + envío a IA + visualizador de respuesta
import { useState, useRef } from 'react'
import type { AIProvider, PageContext } from '../../shared/types'
import { DEFAULT_MODELS } from '../../shared/constants'

const PROVIDERS: { id: AIProvider; label: string; color: string }[] = [
  { id: 'gemini', label: 'Gemini',  color: 'text-blue-400' },
  { id: 'claude', label: 'Claude',  color: 'text-amber-400' },
  { id: 'openai', label: 'OpenAI',  color: 'text-emerald-400' },
]

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function InspectorScreen() {
  const [provider,  setProvider]  = useState<AIProvider>('gemini')
  const [prompt,    setPrompt]    = useState('')
  const [response,  setResponse]  = useState('')
  const [context,   setContext]   = useState<PageContext | null>(null)
  const [status,    setStatus]    = useState<Status>('idle')
  const [tokensUsed, setTokens]   = useState<number | null>(null)
  const [elapsed,   setElapsed]   = useState<number | null>(null)
  const startRef = useRef<number>(0)

  async function captureContext() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT', payload: null })
      setContext(res?.payload ?? null)
    } catch { /* sin contexto */ }
  }

  async function runPrompt() {
    if (!prompt.trim()) return
    setStatus('loading')
    setResponse('')
    setTokens(null)
    setElapsed(null)
    startRef.current = Date.now()

    try {
      // Obtener API key desde storage
      const store  = await chrome.storage.local.get(`webmcp_ai_configs`)
      const configs = (store['webmcp_ai_configs'] as { provider: string; apiKey: string; model: string }[]) ?? []
      const cfg = configs.find(c => c.provider === provider)

      if (!cfg?.apiKey) {
        setResponse('⚠ No hay API Key configurada para ' + provider + '. Ve a Configuración.')
        setStatus('error')
        return
      }

      const fullPrompt = context
        ? `Contexto de la página (${context.title}):\n${context.visibleText.slice(0, 2000)}\n\n---\n\n${prompt}`
        : prompt

      let result = ''
      let tokens = 0

      if (provider === 'gemini') {
        const model = cfg.model || DEFAULT_MODELS.gemini
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
          },
        )
        const data = await r.json()
        result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data, null, 2)
        tokens = data.usageMetadata?.totalTokenCount ?? 0

      } else if (provider === 'claude') {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model:      cfg.model || DEFAULT_MODELS.claude,
            max_tokens: 4096,
            messages:   [{ role: 'user', content: fullPrompt }],
          }),
        })
        const data = await r.json()
        result = data.content?.[0]?.text ?? JSON.stringify(data, null, 2)
        tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)

      } else {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model:    cfg.model || DEFAULT_MODELS.openai,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        })
        const data = await r.json()
        result = data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2)
        tokens = data.usage?.total_tokens ?? 0
      }

      setResponse(result)
      setTokens(tokens)
      setElapsed(Date.now() - startRef.current)
      setStatus('success')
    } catch (err) {
      setResponse(`Error: ${String(err)}`)
      setStatus('error')
    }
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
              className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all duration-150 ${
                provider === p.id
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
            onClick={captureContext}
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
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            Procesando…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
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
              {status === 'error'   && <span className="badge-red">Error</span>}
            </div>
          </div>
          <div className="code-block max-h-64 text-slate-300">
            {response}
          </div>
          <button
            className="btn-ghost mt-1 w-full justify-center text-[10px]"
            onClick={() => navigator.clipboard.writeText(response)}
          >
            Copiar respuesta
          </button>
        </div>
      )}
    </div>
  )
}
