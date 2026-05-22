import { useState, useEffect } from 'react'
import InspectorScreen   from './components/InspectorScreen'
import ConfigScreen      from './components/ConfigScreen'
import AgentsScreen      from './components/AgentsScreen'
import HistoryScreen     from './components/HistoryScreen'
import QuickActions      from './components/QuickActions'
import DebugPanel        from './components/DebugPanel'

import type { AIProvider, PageContext, HistoryEntry } from '../shared/types'
import type { ChatMessage } from '../shared/aiClients'
import { callAI } from '../shared/aiClients'
import { DEFAULT_MODELS } from '../shared/constants'
import { getSettings, appendHistory } from '../storage'

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
const IconDebug = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2M5 5l1.5 1.5M2 12h2M19 5l-1.5 1.5M20 12h2M5 19l1.5-1.5M19 19l-1.5-1.5M12 20v2M12 4a8 8 0 0 0-8 8v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3a8 8 0 0 0-8-8z"/>
  </svg>
)

type Tab = 'inspector' | 'agents' | 'history' | 'config' | 'debug'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inspector')
  const [provider, setProvider] = useState<AIProvider>('gemini')
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [context, setContext] = useState<PageContext | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [tokensUsed, setTokens] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [debugMode, setDebugMode] = useState(false)

  // Cargar Modo Debug inicial y escuchar cambios
  useEffect(() => {
    chrome.storage.local.get('webmcp_debug_mode').then(r => {
      setDebugMode(!!r['webmcp_debug_mode'])
    })

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes['webmcp_debug_mode']) {
        setDebugMode(!!changes['webmcp_debug_mode'].newValue)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // Capturar contexto de la página activa
  async function handleCapturePage(): Promise<PageContext | null> {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT', payload: null })
      const ctx = res?.payload as PageContext | null
      if (ctx) {
        setContext(ctx)
        setActiveTab('inspector')
        return ctx
      }
    } catch (err) {
      console.error('[WebMCP App] Error capturando contexto:', err)
    }
    return null
  }

  // Capturar texto seleccionado
  async function handleCaptureSelection(): Promise<string | null> {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT', payload: null })
      const ctx = res?.payload as PageContext | null
      if (ctx && ctx.selectedText) {
        setPrompt(ctx.selectedText)
        setActiveTab('inspector')
        return ctx.selectedText
      }
    } catch (err) {
      console.error('[WebMCP App] Error capturando seleccion:', err)
    }
    return null
  }

  // Limpiar panel de trabajo
  function handleClear() {
    setPrompt('')
    setResponse('')
    setContext(null)
    setStatus('idle')
    setTokens(null)
    setElapsed(null)
  }

  // Ejecutar el prompt contra la API del modelo
  async function runPrompt() {
    if (!prompt.trim() || status === 'loading') return
    setStatus('loading')
    setResponse('')
    setTokens(null)
    setElapsed(null)

    try {
      const configs = await getSettings()
      const cfg = configs.find(c => c.provider === provider)

      if (!cfg?.apiKey) {
        setResponse('⚠ No hay API Key configurada para ' + provider + '. Ve a Configuración.')
        setStatus('error')
        return
      }

      const fullPrompt = context
        ? `Contexto de la página (${context.title}):\n${context.mainContent.slice(0, 2000)}\n\n---\n\n${prompt}`
        : prompt

      const messages: ChatMessage[] = [
        { role: 'system', content: 'Eres un asistente de IA útil y preciso.' },
        { role: 'user', content: fullPrompt }
      ]

      const chatResponse = await callAI(provider, messages, cfg.apiKey, cfg.model || DEFAULT_MODELS[provider])

      setResponse(chatResponse.text)
      setTokens(chatResponse.tokens_input + chatResponse.tokens_output)
      setElapsed(chatResponse.duration_ms)
      setStatus('success')

      // Registrar en el historial
      const entry: HistoryEntry = {
        id: Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        provider,
        model: chatResponse.model,
        prompt,
        response: chatResponse.text,
        tokensUsed: chatResponse.tokens_input + chatResponse.tokens_output,
        durationMs: chatResponse.duration_ms,
        status: 'success',
        pageContext: context || undefined,
      }
      await appendHistory(entry).catch(() => { })

    } catch (err) {
      setResponse(`Error: ${String(err)}`)
      setStatus('error')
    }
  }

  // Escuchar atajos globales cuando el Side Panel está activo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        handleCapturePage()
      } else if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleCaptureSelection()
      } else if (e.altKey && e.key === 'Enter') {
        e.preventDefault()
        runPrompt()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [prompt, context, provider, status])

  const TABS = [
    { id: 'inspector' as Tab, label: 'Inspector', icon: <IconInspect /> },
    { id: 'agents' as Tab,    label: 'Agentes',   icon: <IconAgents />  },
    { id: 'history' as Tab,   label: 'Historial', icon: <IconHistory /> },
    { id: 'config' as Tab,    label: 'Config',    icon: <IconConfig />  },
  ]

  if (debugMode) {
    TABS.push({ id: 'debug' as Tab, label: 'Debug', icon: <IconDebug /> })
  }

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
      <QuickActions
        onCapturePage={handleCapturePage}
        onCaptureSelection={handleCaptureSelection}
        onClear={handleClear}
      />

      {/* ── Contenido principal ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto animate-fade-in">
        {activeTab === 'inspector' && (
          <InspectorScreen
            provider={provider}
            setProvider={setProvider}
            prompt={prompt}
            setPrompt={setPrompt}
            response={response}
            setResponse={setResponse}
            context={context}
            setContext={setContext}
            status={status}
            tokensUsed={tokensUsed}
            elapsed={elapsed}
            runPrompt={runPrompt}
            onCapturePage={handleCapturePage}
          />
        )}
        {activeTab === 'agents'    && <AgentsScreen />}
        {activeTab === 'history'   && <HistoryScreen />}
        {activeTab === 'config'    && <ConfigScreen setActiveTab={setActiveTab} />}
        {activeTab === 'debug'     && <DebugPanel />}
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
