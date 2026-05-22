// ============================================================
// WebMCP – Modo Debug (T-20)
// Registra el ciclo completo request→response sin exponer keys
// ============================================================

export interface DebugEntry {
  id:           string
  timestamp:    number
  type:         'api' | 'mcp'
  provider?:    string
  tool?:        string
  requestUrl?:  string
  requestBody:  unknown
  responseBody: unknown
  statusCode?:  number
  duration_ms:  number
  tokens?:      { input: number; output: number }
  error?:       string
}

// ── Máscara de API Keys en headers ─────────────────────────
export function maskSensitiveHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const masked = { ...headers }
  const sensitiveKeys = ['x-api-key', 'authorization', 'api-key']
  for (const k of Object.keys(masked)) {
    if (sensitiveKeys.includes(k.toLowerCase())) {
      const val = masked[k]
      // Mostrar solo los primeros 8 chars + ●●●●●●●●
      masked[k] = val.slice(0, 8) + '●●●●●●●●'
    }
  }
  return masked
}

// ── Máscara de API Keys en URL query params ────────────────
export function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.searchParams.has('key')) {
      const key = u.searchParams.get('key')!
      u.searchParams.set('key', key.slice(0, 8) + '●●●●●●●●')
    }
    return u.toString()
  } catch {
    return url
  }
}

// ── Store en chrome.storage (máx 50 entradas) ────────────
const MAX_DEBUG_ENTRIES = 50

export async function addDebugEntry(entry: Omit<DebugEntry, 'id'>): Promise<DebugEntry> {
  const full: DebugEntry = {
    ...entry,
    id: Math.random().toString(36).slice(2),
  }
  try {
    const res = await chrome.storage.local.get('webmcp_debug_logs')
    const current = (res['webmcp_debug_logs'] as DebugEntry[]) ?? []
    const updated = [full, ...current].slice(0, MAX_DEBUG_ENTRIES)
    await chrome.storage.local.set({ webmcp_debug_logs: updated })
  } catch (e) {
    console.error('[Debug] Error guardando log:', e)
  }
  return full
}

export async function getDebugEntries(): Promise<DebugEntry[]> {
  try {
    const res = await chrome.storage.local.get('webmcp_debug_logs')
    return (res['webmcp_debug_logs'] as DebugEntry[]) ?? []
  } catch {
    return []
  }
}

export async function clearDebugEntries(): Promise<void> {
  try {
    await chrome.storage.local.remove('webmcp_debug_logs')
  } catch (e) {
    console.error(e)
  }
}

// ── Wrapper de fetch con logging ──────────────────────────
export async function fetchWithDebug(
  url: string,
  options: RequestInit,
  meta: { type: 'api' | 'mcp'; provider?: string; tool?: string },
  debugMode: boolean,
): Promise<Response> {
  if (!debugMode) {
    return fetch(url, options)
  }

  const start = Date.now()
  const maskedUrl = maskUrl(url)
  const headers   = options.headers as Record<string, string> | undefined
  const maskedHdr = headers ? maskSensitiveHeaders(headers) : {}

  let requestBody: unknown = null
  if (options.body && typeof options.body === 'string') {
    try { requestBody = JSON.parse(options.body) } catch { requestBody = options.body }
  }

  let response: Response

  try {
    response = await fetch(url, options)
  } catch (err) {
    const duration_ms = Date.now() - start
    addDebugEntry({
      timestamp:    Date.now(),
      type:         meta.type,
      provider:     meta.provider,
      tool:         meta.tool,
      requestUrl:   maskedUrl,
      requestBody:  { headers: maskedHdr, body: requestBody },
      responseBody: null,
      duration_ms,
      error:        String(err),
    })
    throw err
  }

  // Clonar para leer sin consumir el body
  const cloned = response.clone()
  let responseBody: unknown = null
  try {
    responseBody = await cloned.json()
  } catch {
    responseBody = await cloned.text().catch(() => null)
  }

  addDebugEntry({
    timestamp:    Date.now(),
    type:         meta.type,
    provider:     meta.provider,
    tool:         meta.tool,
    requestUrl:   maskedUrl,
    requestBody:  { headers: maskedHdr, body: requestBody },
    responseBody,
    statusCode:   response.status,
    duration_ms:  Date.now() - start,
    error:        response.ok ? undefined : `HTTP ${response.status}`,
  })

  return response
}

// ── Componente React de visualización (DebugPanel) ────────
// Exportado como datos + helper, el componente está en DebugPanel.tsx
export function formatDebugTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-ES', {
    hour:        '2-digit',
    minute:      '2-digit',
    second:      '2-digit',
    fractionalSecondDigits: 3,
  })
}
