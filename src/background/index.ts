import type { Message, PageContext, MCPServer } from '../shared/types'
import { getDebugMode } from '../storage'
import { McpClient } from '../shared/mcpClient'

// Registry of active MCP WebSocket clients in Service Worker memory
const mcpClients = new Map<string, McpClient>()

// Reconnect to active MCP servers at Service Worker startup
async function reconnectActiveServers() {
  const stored = await chrome.storage.local.get('webmcp_mcp_servers')
  const servers = (stored['webmcp_mcp_servers'] as MCPServer[]) ?? []
  for (const s of servers) {
    if (s.status === 'connected' || s.status === 'connecting') {
      const client = new McpClient(s.url)
      mcpClients.set(s.id, client)
      
      client.onStatusChange(async (status) => {
        const currentStored = await chrome.storage.local.get('webmcp_mcp_servers')
        const currentServers = (currentStored['webmcp_mcp_servers'] as MCPServer[]) ?? []
        const updated = currentServers.map(item => {
          if (item.id === s.id) return { ...item, status }
          return item
        })
        await chrome.storage.local.set({ webmcp_mcp_servers: updated })
      })

      client.connect().then(async () => {
        const tools = await client.listTools()
        const currentStored = await chrome.storage.local.get('webmcp_mcp_servers')
        const currentServers = (currentStored['webmcp_mcp_servers'] as MCPServer[]) ?? []
        const updated = currentServers.map(item => {
          if (item.id === s.id) {
            return {
              ...item,
              status: 'connected' as const,
              tools: tools.map(t => ({
                name: t.name,
                description: t.description ?? '',
                inputSchema: t.inputSchema ?? {},
              })),
            }
          }
          return item
        })
        await chrome.storage.local.set({ webmcp_mcp_servers: updated })
      }).catch(() => {
        // Fallback to error status
      })
    }
  }
}

reconnectActiveServers().catch(console.error)

// ── Abrir Side Panel al hacer clic en el icono ───────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error)

// ── Escuchar mensajes de Side Panel y Content Script ─────────
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse)
    return true  // mantiene el canal abierto para respuestas async
  },
)

async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: Message | any) => void,
) {
  const debugMode = await getDebugMode()

  if (debugMode) {
    console.log('[WebMCP BG]', message.type, message.payload)
  }

  switch (message.type) {
    case 'GET_PAGE_CONTEXT': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        sendResponse({ type: 'PAGE_CONTEXT_RESPONSE', payload: null, error: 'No active tab' })
        return
      }
      try {
        // Intentar obtener el contexto del script de contenido ya inyectado (con toda la lógica inteligente)
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT', payload: null })
        if (response?.payload) {
          const context = response.payload as PageContext
          context.tabId = tab.id
          sendResponse({ type: 'PAGE_CONTEXT_RESPONSE', payload: context })
          return
        }
      } catch (err) {
        if (debugMode) {
          console.warn('[WebMCP BG] No se pudo comunicar con el content script, usando fallback de executeScript:', err)
        }
      }

      // Fallback: Ejecutar script in situ si el content script no respondió
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageContextFallback,
        })
        const context = results[0]?.result as PageContext | null
        if (context) {
          context.tabId = tab.id
        }
        sendResponse({ type: 'PAGE_CONTEXT_RESPONSE', payload: context })
      } catch (err) {
        sendResponse({
          type: 'PAGE_CONTEXT_RESPONSE',
          payload: null,
          error: String(err),
        })
      }
      break
    }

    case 'RUN_PROMPT': {
      if (debugMode) {
        console.log('[WebMCP BG] RUN_PROMPT recibido – gestionado por el panel')
      }
      break
    }

    case 'MCP_CONNECT': {
      const { id, url } = message.payload as { id: string; url: string }
      let client = mcpClients.get(id)
      if (client) {
        client.disconnect()
        mcpClients.delete(id)
      }

      client = new McpClient(url)
      mcpClients.set(id, client)

      client.onStatusChange(async (status) => {
        const stored = await chrome.storage.local.get('webmcp_mcp_servers')
        const servers = (stored['webmcp_mcp_servers'] as MCPServer[]) ?? []
        const updated = servers.map(s => s.id === id ? { ...s, status } : s)
        await chrome.storage.local.set({ webmcp_mcp_servers: updated })
      })

      try {
        await client.connect()
        const tools = await client.listTools()
        const stored = await chrome.storage.local.get('webmcp_mcp_servers')
        const servers = (stored['webmcp_mcp_servers'] as MCPServer[]) ?? []
        const updated = servers.map(s => {
          if (s.id === id) {
            return {
              ...s,
              status: 'connected' as const,
              tools: tools.map(t => ({
                name: t.name,
                description: t.description ?? '',
                inputSchema: t.inputSchema ?? {},
              })),
              lastConnectedAt: Date.now(),
            }
          }
          return s
        })
        await chrome.storage.local.set({ webmcp_mcp_servers: updated })
        sendResponse({ type: 'MCP_TOOL_RESPONSE', payload: { success: true, tools } })
      } catch (err) {
        const stored = await chrome.storage.local.get('webmcp_mcp_servers')
        const servers = (stored['webmcp_mcp_servers'] as MCPServer[]) ?? []
        const updated = servers.map(s => s.id === id ? { ...s, status: 'error' as const, tools: [] } : s)
        await chrome.storage.local.set({ webmcp_mcp_servers: updated })
        sendResponse({ type: 'MCP_TOOL_RESPONSE', payload: null, error: String(err) })
      }
      break
    }

    case 'MCP_DISCONNECT': {
      const { id } = message.payload as { id: string }
      const client = mcpClients.get(id)
      if (client) {
        client.disconnect()
        mcpClients.delete(id)
      }
      const stored = await chrome.storage.local.get('webmcp_mcp_servers')
      const servers = (stored['webmcp_mcp_servers'] as MCPServer[]) ?? []
      const updated = servers.map(s => s.id === id ? { ...s, status: 'disconnected' as const, tools: [] } : s)
      await chrome.storage.local.set({ webmcp_mcp_servers: updated })
      sendResponse({ type: 'MCP_TOOL_RESPONSE', payload: { success: true } })
      break
    }

    case 'MCP_TOOL_CALL': {
      const { id, tool, arguments: args } = message.payload as { id: string; tool: string; arguments: Record<string, unknown> }
      const client = mcpClients.get(id)
      if (!client || !client.isConnected) {
        sendResponse({ type: 'MCP_TOOL_RESPONSE', payload: null, error: 'Servidor MCP no conectado' })
        return
      }
      try {
        const result = await client.callTool(tool, args)
        sendResponse({ type: 'MCP_TOOL_RESPONSE', payload: result })
      } catch (err) {
        sendResponse({ type: 'MCP_TOOL_RESPONSE', payload: null, error: String(err) })
      }
      break
    }

    case 'DEBUG_LOG': {
      if (debugMode) {
        console.log('[WebMCP DEBUG]', message.payload)
      }
      break
    }

    default:
      break
  }
}

// ── Función inyectada de fallback para extraer contexto (corre en la página) ─
function extractPageContextFallback(): PageContext {
  const MAX_CHARS = 8_000

  const walker = document.createTreeWalker(
    document.body || document.documentElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName.toLowerCase()
        if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  let mainContent = ''
  let node: Node | null
  while ((node = walker.nextNode()) && mainContent.length < MAX_CHARS) {
    const text = node.textContent?.trim()
    if (text) {
      mainContent += text + ' '
    }
  }

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''

  return {
    url:          window.location.href,
    title:        document.title,
    description:  metaDesc,
    mainContent:  mainContent.trim().slice(0, MAX_CHARS),
    selectedText: window.getSelection()?.toString().slice(0, 2_000) || undefined,
    images:       [],
    links:        [],
    wordCount:    mainContent.split(/\s+/).filter(Boolean).length,
    lang:         document.documentElement.lang || navigator.language || 'es',
    timestamp:    Date.now(),
    tabId:        0,
  }
}

// ── Limpiar conexiones al cerrar tabs ────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[WebMCP BG] Tab cerrado:', tabId)
})

console.log('[WebMCP BG] Service Worker iniciado.')
