// ============================================================
// WebMCP – Cliente WebSocket MCP (T-15)
// Protocolo JSON-RPC 2.0 sobre WebSocket con reconexión
// ============================================================

export interface McpRequest {
  method: string
  params?: Record<string, unknown>
}

export interface McpError {
  code: number
  message: string
  data?: unknown
}

export interface McpResponse {
  result?: unknown
  error?: McpError
}

export type McpConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export type McpStatusListener = (status: McpConnectionStatus) => void

export class McpClient {
  private ws: WebSocket | null = null
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (reason: unknown) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  private requestCounter = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null
  private statusListeners: McpStatusListener[] = []
  private initialized = false
  private rawMessageListeners: ((raw: string) => void)[] = []

  constructor(
    private readonly url: string,
    private readonly timeoutMs = 30_000,
    private readonly reconnectDelayMs = 5_000,
  ) {}

  // ── Listeners de estado ────────────────────────────────────
  onStatusChange(listener: McpStatusListener): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener)
    }
  }

  // ── Listeners de mensajes crudos (para el puente de agentes) ──
  onRawMessage(listener: (raw: string) => void): () => void {
    this.rawMessageListeners.push(listener)
    return () => {
      this.rawMessageListeners = this.rawMessageListeners.filter(l => l !== listener)
    }
  }

  sendRawMessage(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message)
    }
  }

  private emitStatus(status: McpConnectionStatus) {
    this.statusListeners.forEach(l => l(status))
  }

  // ── Conexión ───────────────────────────────────────────────
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.emitStatus('connecting')

      try {
        this.ws = new WebSocket(this.url)
      } catch (err) {
        this.emitStatus('error')
        reject(err)
        return
      }

      this.ws.onopen = async () => {
        try {
          await this.initialize()
          this.startKeepalive()
          this.emitStatus('connected')
          resolve()
        } catch (err) {
          this.emitStatus('error')
          reject(err)
        }
      }

      this.ws.onmessage = (event: MessageEvent) => {
        const raw = event.data as string
        this.handleMessage(raw)
        this.rawMessageListeners.forEach(l => l(raw))
      }

      this.ws.onerror = () => {
        this.emitStatus('error')
        reject(new Error(`WebSocket error: ${this.url}`))
      }

      this.ws.onclose = () => {
        this.stopKeepalive()
        this.emitStatus('disconnected')
        this.scheduleReconnect()
      }
    })
  }

  // ── Handshake MCP initialize ───────────────────────────────
  private async initialize(): Promise<void> {
    if (this.initialized) return
    await this.call({
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'WebMCP', version: '1.0.0' },
      },
    })
    this.initialized = true
  }

  // ── Dispatch de mensajes entrantes ─────────────────────────
  private handleMessage(raw: string): void {
    let data: McpResponse & { id?: string | number; method?: string }
    try {
      data = JSON.parse(raw) as typeof data
    } catch {
      console.warn('[McpClient] Mensaje no válido JSON:', raw)
      return
    }

    // Notificación del servidor (sin id): ignorar silenciosamente
    if (data.id === undefined || data.id === null) return

    const id = String(data.id)
    const pending = this.pendingRequests.get(id)
    if (!pending) return

    clearTimeout(pending.timer)
    this.pendingRequests.delete(id)

    if (data.error) {
      pending.reject(data.error)
    } else {
      pending.resolve(data.result)
    }
  }

  // ── Llamada genérica ───────────────────────────────────────
  call(request: McpRequest): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket no conectado'))
    }

    const id = String(++this.requestCounter)
    const message = { jsonrpc: '2.0', id, ...request }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Timeout: ${request.method} (${this.timeoutMs}ms)`))
      }, this.timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timer })
      this.ws!.send(JSON.stringify(message))
    })
  }

  // ── Métodos MCP de alto nivel ──────────────────────────────
  async listTools(): Promise<McpToolEntry[]> {
    const result = await this.call({ method: 'tools/list' }) as { tools: McpToolEntry[] }
    return result?.tools ?? []
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    return this.call({
      method: 'tools/call',
      params: { name, arguments: args },
    })
  }

  async listResources(): Promise<unknown[]> {
    const result = await this.call({ method: 'resources/list' }) as { resources: unknown[] }
    return result?.resources ?? []
  }

  // ── Keepalive (evita que el SW se duerma) ─────────────────
  private startKeepalive() {
    this.keepaliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // ping como notificación (sin id = no espera respuesta)
        this.ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'ping' }))
      }
    }, 25_000)
  }

  private stopKeepalive() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval)
      this.keepaliveInterval = null
    }
  }

  // ── Reconexión automática ──────────────────────────────────
  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.initialized = false
      this.connect().catch(() => { /* la reconexión fallida programará otra */ })
    }, this.reconnectDelayMs)
  }

  // ── Desconexión manual ─────────────────────────────────────
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopKeepalive()

    // Rechazar peticiones pendientes
    this.pendingRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer)
      reject(new Error('Desconectado por el usuario'))
    })
    this.pendingRequests.clear()

    this.ws?.close()
    this.ws = null
    this.initialized = false
    this.emitStatus('disconnected')
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// ── Tipos auxiliares ───────────────────────────────────────
export interface McpToolEntry {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

// ── Registro global de clientes (usado por el Background SW) ─
export const mcpRegistry = new Map<string, McpClient>()
