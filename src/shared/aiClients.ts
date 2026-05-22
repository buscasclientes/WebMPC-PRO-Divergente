// ============================================================
// WebMCP – Clientes de IA (T-16)
// Gemini · Claude · OpenAI — desde el Service Worker (sin CORS)
// ============================================================
import { getDebugMode } from '../storage'
import { fetchWithDebug } from './debug'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  text: string
  tokens_input: number
  tokens_output: number
  model: string
  duration_ms: number
}

// ── Errores de API con mensaje amigable ────────────────────
function friendlyError(status: number, provider: string): string {
  switch (status) {
    case 401: return `API Key incorrecta para ${provider}. Ve a Configuración para actualizarla.`
    case 403: return `Acceso denegado a ${provider}. Verifica que la API Key tiene los permisos correctos.`
    case 429: return `Límite de peticiones alcanzado en ${provider}. Espera unos segundos e inténtalo de nuevo.`
    case 500:
    case 502:
    case 503: return `Error en los servidores de ${provider}. Inténtalo de nuevo en unos momentos.`
    default:  return `Error ${status} al conectar con ${provider}.`
  }
}

// ── GEMINI ──────────────────────────────────────────────────
export async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
  model = 'gemini-2.5-flash',
): Promise<ChatResponse> {
  const start = Date.now()
  const systemMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const debugMode = await getDebugMode()
  const response = await fetchWithDebug(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemMsg
          ? { parts: [{ text: systemMsg.content }] }
          : undefined,
        contents: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 4096 },
      }),
    },
    { type: 'api', provider: 'gemini' },
    debugMode
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message: string } }
    throw new Error(data.error?.message ?? friendlyError(response.status, 'Gemini'))
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }

  return {
    text:          data.candidates[0]?.content?.parts?.[0]?.text ?? '',
    tokens_input:  data.usageMetadata?.promptTokenCount ?? 0,
    tokens_output: data.usageMetadata?.candidatesTokenCount ?? 0,
    model,
    duration_ms:   Date.now() - start,
  }
}

// ── CLAUDE ──────────────────────────────────────────────────
export async function callClaude(
  messages: ChatMessage[],
  apiKey: string,
  model = 'claude-sonnet-4-6',
): Promise<ChatResponse> {
  const start = Date.now()
  const systemMsg = messages.find(m => m.role === 'system')

  const debugMode = await getDebugMode()
  const response = await fetchWithDebug(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':        apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system:     systemMsg?.content,
        messages:   messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content })),
      }),
    },
    { type: 'api', provider: 'claude' },
    debugMode
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message: string } }
    throw new Error(data.error?.message ?? friendlyError(response.status, 'Claude'))
  }

  const data = await response.json() as {
    content: Array<{ text: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }

  return {
    text:          data.content?.[0]?.text ?? '',
    tokens_input:  data.usage?.input_tokens ?? 0,
    tokens_output: data.usage?.output_tokens ?? 0,
    model,
    duration_ms:   Date.now() - start,
  }
}

// ── OPENAI ──────────────────────────────────────────────────
export async function callOpenAI(
  messages: ChatMessage[],
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<ChatResponse> {
  const start = Date.now()

  const debugMode = await getDebugMode()
  const response = await fetchWithDebug(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    },
    { type: 'api', provider: 'openai' },
    debugMode
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message: string } }
    throw new Error(data.error?.message ?? friendlyError(response.status, 'OpenAI'))
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  return {
    text:          data.choices?.[0]?.message?.content ?? '',
    tokens_input:  data.usage?.prompt_tokens ?? 0,
    tokens_output: data.usage?.completion_tokens ?? 0,
    model,
    duration_ms:   Date.now() - start,
  }
}

// ── Dispatcher unificado ───────────────────────────────────
export async function callAI(
  provider: 'gemini' | 'claude' | 'openai',
  messages: ChatMessage[],
  apiKey: string,
  model?: string,
): Promise<ChatResponse> {
  switch (provider) {
    case 'gemini': return callGemini(messages, apiKey, model)
    case 'claude': return callClaude(messages, apiKey, model)
    case 'openai': return callOpenAI(messages, apiKey, model)
  }
}
