// ============================================================
// WebMCP – Tipos compartidos entre todos los componentes
// ============================================================

// ── Modelos de IA soportados ─────────────────────────────────
export type AIProvider = 'gemini' | 'claude' | 'openai'

export interface AIConfig {
  provider: AIProvider
  apiKey: string          // almacenada cifrada en chrome.storage
  model: string           // p.ej. "gemini-1.5-pro", "claude-3-5-sonnet"
  maxTokens: number
  temperature: number
}

// ── Servidor MCP ────────────────────────────────────────────
export interface MCPServer {
  id: string
  name: string
  url: string             // ws://localhost:PORT o wss://host
  status: 'connected' | 'disconnected' | 'error' | 'connecting'
  tools: MCPTool[]
  lastConnectedAt?: number
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

// ── Contexto de página ──────────────────────────────────────
export interface PageContext {
  url: string
  title: string
  selectedText: string
  visibleText: string     // primeros N chars del body visible
  timestamp: number
  tabId: number
}

// ── Historial de llamadas ───────────────────────────────────
export type CallStatus = 'pending' | 'success' | 'error'

export interface HistoryEntry {
  id: string
  timestamp: number
  provider: AIProvider
  model: string
  prompt: string
  response: string
  tokensUsed: number
  durationMs: number
  status: CallStatus
  pageContext?: PageContext
  mcpToolCalls?: MCPToolCall[]
}

export interface MCPToolCall {
  tool: string
  arguments: Record<string, unknown>
  result: unknown
  durationMs: number
}

// ── Message Passing (Service Worker ↔ Side Panel ↔ Content) ──
export type MessageType =
  | 'GET_PAGE_CONTEXT'
  | 'PAGE_CONTEXT_RESPONSE'
  | 'OPEN_SIDE_PANEL'
  | 'RUN_PROMPT'
  | 'PROMPT_RESPONSE'
  | 'MCP_CONNECT'
  | 'MCP_DISCONNECT'
  | 'MCP_TOOL_CALL'
  | 'MCP_TOOL_RESPONSE'
  | 'DEBUG_LOG'
  | 'STORAGE_UPDATED'

export interface Message<T = unknown> {
  type: MessageType
  payload: T
  requestId?: string      // para correlacionar petición/respuesta
  error?: string
}

// ── Configuración almacenada ─────────────────────────────────
export interface ExtensionSettings {
  aiConfigs: AIConfig[]
  activeProvider: AIProvider
  mcpServers: MCPServer[]
  debugMode: boolean
  maxHistoryEntries: number
  theme: 'dark' | 'system'
}
