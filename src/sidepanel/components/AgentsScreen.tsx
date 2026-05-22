// ── Agents MCP Screen (T-12) ─────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import type { MCPServer, MCPTool } from '../../shared/types'

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function AgentsScreen() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [newUrl,  setNewUrl]  = useState('')
  const [newName, setNewName] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const wsRefs = useRef<Record<string, WebSocket>>({})

  useEffect(() => {
    chrome.storage.local.get('webmcp_mcp_servers').then(r => {
      setServers((r['webmcp_mcp_servers'] as MCPServer[]) ?? [])
    })
  }, [])

  async function persist(updated: MCPServer[]) {
    setServers(updated)
    await chrome.storage.local.set({ webmcp_mcp_servers: updated })
  }

  function addServer() {
    if (!newUrl.trim()) return
    const server: MCPServer = {
      id:     randomId(),
      name:   newName.trim() || newUrl,
      url:    newUrl.trim(),
      status: 'disconnected',
      tools:  [],
    }
    persist([...servers, server])
    setNewUrl('')
    setNewName('')
  }

  function removeServer(id: string) {
    wsRefs.current[id]?.close()
    delete wsRefs.current[id]
    persist(servers.filter(s => s.id !== id))
  }

  function connect(server: MCPServer) {
    updateStatus(server.id, 'connecting')
    try {
      const ws = new WebSocket(server.url)
      wsRefs.current[server.id] = ws

      ws.onopen = () => {
        updateStatus(server.id, 'connected')
        // Enviar initialize MCP
        ws.send(JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'WebMCP', version: '1.0.0' } },
        }))
        // Solicitar lista de tools
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string)
          if (data.id === 2 && data.result?.tools) {
            const tools: MCPTool[] = data.result.tools.map((t: { name: string; description?: string; inputSchema?: Record<string, unknown> }) => ({
              name:        t.name,
              description: t.description ?? '',
              inputSchema: t.inputSchema ?? {},
            }))
            setServers(prev => prev.map(s => s.id === server.id ? { ...s, tools } : s))
            chrome.storage.local.get('webmcp_mcp_servers').then(r => {
              const updated = ((r['webmcp_mcp_servers'] as MCPServer[]) ?? []).map(
                s => s.id === server.id ? { ...s, tools } : s,
              )
              chrome.storage.local.set({ webmcp_mcp_servers: updated })
            })
          }
        } catch { /* parse error */ }
      }

      ws.onerror  = () => updateStatus(server.id, 'error')
      ws.onclose  = () => updateStatus(server.id, 'disconnected')
    } catch {
      updateStatus(server.id, 'error')
    }
  }

  function disconnect(id: string) {
    wsRefs.current[id]?.close()
    delete wsRefs.current[id]
    updateStatus(id, 'disconnected')
  }

  function updateStatus(id: string, status: MCPServer['status']) {
    setServers(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const statusDot = (s: MCPServer['status']) => {
    switch (s) {
      case 'connected':    return <span className="dot-connected" />
      case 'disconnected': return <span className="dot-disconnected" />
      case 'error':        return <span className="dot-error" />
      case 'connecting':   return <span className="dot-connecting" />
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 animate-slide-up">
      <div>
        <h1 className="text-sm font-semibold text-slate-200">Agentes MCP</h1>
        <p className="text-[11px] text-slate-500 mt-0.5">Conecta con servidores Model Context Protocol locales o remotos.</p>
      </div>

      {/* Añadir servidor */}
      <div className="card flex flex-col gap-2">
        <p className="section-title mb-0">Añadir servidor</p>
        <input id="mcp-name" className="input" placeholder="Nombre (ej: Mi servidor local)" value={newName} onChange={e => setNewName(e.target.value)} />
        <input id="mcp-url"  className="input" placeholder="ws://localhost:8080" value={newUrl}  onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addServer()} />
        <button id="btn-add-server" className="btn-primary justify-center" onClick={addServer}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Añadir
        </button>
      </div>

      {/* Lista de servidores */}
      {servers.length === 0 ? (
        <div className="text-center py-8 text-slate-600 text-xs">
          <svg className="mx-auto mb-2 opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
          Sin servidores MCP configurados
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.map(server => (
            <div key={server.id} className="card">
              <div className="flex items-center gap-2">
                {statusDot(server.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{server.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{server.url}</p>
                </div>
                <div className="flex items-center gap-1">
                  {server.status === 'connected'
                    ? <button className="btn-ghost py-0.5 px-2 text-[10px]" onClick={() => disconnect(server.id)}>Desconectar</button>
                    : <button className="btn-primary py-0.5 px-2 text-[10px]" onClick={() => connect(server)}>Conectar</button>
                  }
                  <button className="btn-danger py-0.5 px-2 text-[10px]" onClick={() => removeServer(server.id)}>✕</button>
                </div>
              </div>

              {/* Tools list */}
              {server.tools.length > 0 && (
                <div className="mt-2">
                  <button
                    className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    onClick={() => setExpanded(expanded === server.id ? null : server.id)}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      style={{ transform: expanded === server.id ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {server.tools.length} herramienta{server.tools.length !== 1 ? 's' : ''}
                  </button>
                  {expanded === server.id && (
                    <div className="mt-1.5 flex flex-col gap-1 animate-fade-in">
                      {server.tools.map((tool: MCPTool) => (
                        <div key={tool.name} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-surface-700">
                          <code className="text-[10px] text-primary-300 font-mono">{tool.name}</code>
                          {tool.description && (
                            <span className="text-[10px] text-slate-500 truncate">{tool.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
