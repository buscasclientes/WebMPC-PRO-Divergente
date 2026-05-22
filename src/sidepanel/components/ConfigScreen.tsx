import { useState, useEffect } from 'react'
import type { AIProvider } from '../../shared/types'
import { DEFAULT_MODELS } from '../../shared/constants'
import { getSettings, setSettings, getDebugMode, setDebugMode } from '../../storage'

interface ProviderConfig {
  provider: AIProvider
  apiKey:   string
  model:    string
}

const PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'claude', label: 'Anthropic Claude', placeholder: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
]

interface ConfigScreenProps {
  setActiveTab?: (tab: 'inspector' | 'agents' | 'history' | 'config' | 'debug') => void
}

export default function ConfigScreen({ setActiveTab }: ConfigScreenProps) {
  const [configs, setConfigs] = useState<ProviderConfig[]>([])
  const [saved,   setSaved]   = useState(false)
  const [show,    setShow]    = useState<Record<AIProvider, boolean>>({ gemini: false, claude: false, openai: false })
  const [debugMode, setLocalDebugMode] = useState(false)

  useEffect(() => {
    getSettings().then(stored => {
      if (stored?.length) {
        setConfigs(stored)
      } else {
        setConfigs(PROVIDERS.map(p => ({ provider: p.id, apiKey: '', model: DEFAULT_MODELS[p.id] })))
      }
    })
    getDebugMode().then(val => {
      setLocalDebugMode(val)
    })
  }, [])

  function update(provider: AIProvider, field: keyof ProviderConfig, value: string) {
    setConfigs(prev => prev.map(c => c.provider === provider ? { ...c, [field]: value } : c))
    setSaved(false)
  }

  async function save() {
    await setSettings(configs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function toggleDebug(val: boolean) {
    setLocalDebugMode(val)
    await setDebugMode(val)
  }

  return (
    <div className="flex flex-col gap-4 p-3 animate-slide-up">
      <div>
        <h1 className="text-sm font-semibold text-slate-200">Configuración</h1>
        <p className="text-[11px] text-slate-500 mt-0.5">Las API Keys se almacenan localmente en tu navegador.</p>
      </div>

      {PROVIDERS.map(prov => {
        const cfg = configs.find(c => c.provider === prov.id)
        return (
          <div key={prov.id} className="card flex flex-col gap-2">
            <p className="section-title mb-0">{prov.label}</p>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block" htmlFor={`key-${prov.id}`}>
                API Key
              </label>
              <div className="relative">
                <input
                  id={`key-${prov.id}`}
                  type={show[prov.id] ? 'text' : 'password'}
                  className="input pr-8"
                  placeholder={prov.placeholder}
                  value={cfg?.apiKey ?? ''}
                  onChange={e => update(prov.id, 'apiKey', e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShow(s => ({ ...s, [prov.id]: !s[prov.id] }))}
                  title={show[prov.id] ? 'Ocultar' : 'Mostrar'}
                >
                  {show[prov.id]
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block" htmlFor={`model-${prov.id}`}>
                Modelo
              </label>
              <input
                id={`model-${prov.id}`}
                className="input"
                value={cfg?.model ?? ''}
                onChange={e => update(prov.id, 'model', e.target.value)}
                placeholder={DEFAULT_MODELS[prov.id]}
              />
            </div>

            {cfg?.apiKey && (
              <div className="flex items-center gap-1.5">
                <span className="dot-connected" />
                <span className="text-[10px] text-emerald-400">Key configurada</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Modo Debug Toggle */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-xs font-semibold text-slate-200">Modo Debug</p>
            <p className="text-[10px] text-slate-500">Habilita registro de trazas de APIs e interacciones MCP.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="toggle-debug-mode"
              type="checkbox"
              className="sr-only peer"
              checked={debugMode}
              onChange={e => toggleDebug(e.target.checked)}
            />
            <div className="w-9 h-5 bg-surface-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
        {debugMode && setActiveTab && (
          <button
            className="text-[10px] text-primary-400 hover:text-primary-300 underline font-medium mt-1 text-left"
            onClick={() => setActiveTab('debug')}
          >
            Ver trazas activas (Log de Debug) &rarr;
          </button>
        )}
      </div>

      <button id="btn-save-config" className="btn-primary justify-center" onClick={save}>
        {saved
          ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Guardado</>
          : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar configuración</>
        }
      </button>

      <div className="card border-amber-500/20 bg-amber-500/5">
        <p className="text-[10px] text-amber-400 leading-relaxed">
          <strong>Privacidad:</strong> Las API Keys nunca se envían a servidores externos. Se almacenan únicamente en tu navegador usando <code className="bg-surface-700 px-1 rounded">chrome.storage.local</code>.
        </p>
      </div>
    </div>
  )
}
