// ============================================================
// WebMCP – Parser de respuestas MCP (T-17)
// Normaliza el formato JSON-RPC 2.0 de cualquier servidor MCP
// ============================================================

export type McpContentItem =
  | { type: 'text';     text: string }
  | { type: 'image';    data: string; mimeType: string }
  | { type: 'resource'; uri: string;  text?: string }
  | { type: 'error';    message: string }

export interface ParsedMcpResult {
  success:      boolean
  items:        McpContentItem[]
  rawText:      string    // concatenación de textos → input directo para IA
  hasImages:    boolean
  hasResources: boolean
}

type RawContentItem = {
  type:      string
  text?:     string
  data?:     string
  mimeType?: string
  resource?: { uri: string; text?: string }
}

type RawMcpResult = {
  content?:  RawContentItem[]
  isError?:  boolean
}

// ── Parser principal ───────────────────────────────────────
export function parseMcpResponse(raw: unknown): ParsedMcpResult {
  // Error de protocolo JSON-RPC
  if (isRpcError(raw)) {
    const msg = (raw as { error: { message: string } }).error.message
    return errorResult(msg)
  }

  // Resultado vacío o nulo
  if (raw === null || raw === undefined) {
    return errorResult('Respuesta vacía del servidor MCP')
  }

  // Cadena de texto directa (algunos servidores devuelven string)
  if (typeof raw === 'string') {
    return successResult([{ type: 'text', text: raw }])
  }

  const result = raw as RawMcpResult

  // isError explícito del servidor
  if (result.isError === true) {
    const msg = extractFirstText(result.content) ?? 'Error en la herramienta MCP'
    return errorResult(msg)
  }

  const items = parseContentArray(result.content ?? [])
  return successResult(items)
}

function parseContentArray(content: RawContentItem[]): McpContentItem[] {
  return content.map(item => {
    switch (item.type) {
      case 'text':
        return { type: 'text' as const, text: item.text ?? '' }
      case 'image':
        return { type: 'image' as const, data: item.data ?? '', mimeType: item.mimeType ?? 'image/png' }
      case 'resource':
        return { type: 'resource' as const, uri: item.resource?.uri ?? '', text: item.resource?.text }
      default:
        // Tipo desconocido → serializar como texto
        return { type: 'text' as const, text: JSON.stringify(item) }
    }
  })
}

function successResult(items: McpContentItem[]): ParsedMcpResult {
  const rawText = items
    .map(i => {
      if (i.type === 'text')     return i.text
      if (i.type === 'resource') return i.text ?? i.uri
      return ''
    })
    .filter(Boolean)
    .join('\n')

  return {
    success:      true,
    items,
    rawText,
    hasImages:    items.some(i => i.type === 'image'),
    hasResources: items.some(i => i.type === 'resource'),
  }
}

function errorResult(message: string): ParsedMcpResult {
  return {
    success:      false,
    items:        [{ type: 'error', message }],
    rawText:      message,
    hasImages:    false,
    hasResources: false,
  }
}

function isRpcError(raw: unknown): boolean {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'error' in raw &&
    typeof (raw as { error: unknown }).error === 'object'
  )
}

function extractFirstText(content?: RawContentItem[]): string | undefined {
  return content?.find(i => i.type === 'text')?.text
}

// ── Serializar contexto de página para el prompt ──────────
export function formatPageContextForPrompt(ctx: {
  url: string
  title: string
  description?: string
  lang?: string
  wordCount?: number
  mainContent: string
}): string {
  return [
    `URL: ${ctx.url}`,
    `Título: ${ctx.title}`,
    ctx.description  ? `Descripción: ${ctx.description}` : '',
    ctx.lang         ? `Idioma: ${ctx.lang}` : '',
    ctx.wordCount    ? `Palabras aprox.: ${ctx.wordCount}` : '',
    '',
    'CONTENIDO PRINCIPAL:',
    ctx.mainContent,
  ].filter(l => l !== undefined).join('\n')
}
