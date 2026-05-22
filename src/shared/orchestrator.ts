// ============================================================
// WebMCP – Orquestador de flujos de automatización (T-19)
// Flujos: Explicar página · Resumir selección · Agente MCP
// ============================================================
import type { ChatMessage, ChatResponse } from './aiClients'
import { callAI } from './aiClients'
import type { McpClient } from './mcpClient'
import { parseMcpResponse, formatPageContextForPrompt } from './mcpParser'
import type { AIProvider, HistoryEntry, PageContext } from './types'
import { appendHistory, getSettings } from '../storage'

type Provider = AIProvider

// ── Helper: obtener API Key de storage ────────────────────
async function getApiKey(provider: Provider): Promise<string> {
  const configs = await getSettings()
  const cfg = configs.find(c => c.provider === provider)
  if (!cfg?.apiKey) throw new Error(`API Key de ${provider} no configurada. Ve a ⚙ Configuración.`)
  return cfg.apiKey
}

async function getModel(provider: Provider): Promise<string | undefined> {
  const configs = await getSettings()
  return configs.find(c => c.provider === provider)?.model
}

// ── Función de registro en historial ──────────────────────
async function logToHistory(
  provider: Provider,
  prompt: string,
  result: ChatResponse,
  status: 'success' | 'error' = 'success',
) {
  const entry: HistoryEntry = {
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    provider,
    model: result.model,
    prompt,
    response: result.text,
    tokensUsed: result.tokens_input + result.tokens_output,
    durationMs: result.duration_ms,
    status,
  }
  await appendHistory(entry).catch(() => { /* no bloquear si falla */ })
}

// ── Flujo A: Explicar página ───────────────────────────────
export async function runExplainPage(
  context: PageContext,
  provider: Provider,
): Promise<string> {
  const apiKey = await getApiKey(provider)
  const model = await getModel(provider)
  const contextStr = formatPageContextForPrompt(context)
  const prompt = `Explica el siguiente contenido web en 2-3 párrafos claros y concisos:\n\n${contextStr}`

  const messages: ChatMessage[] = [
    { role: 'system', content: 'Eres un asistente que explica contenido web de forma clara y concisa en el mismo idioma que el contenido.' },
    { role: 'user', content: prompt },
  ]

  const result = await callAI(provider, messages, apiKey, model)
  await logToHistory(provider, prompt, result)
  return result.text
}

// ── Flujo B: Resumir selección ─────────────────────────────
export async function runSummarizeSelection(
  selectedText: string,
  provider: Provider,
): Promise<string> {
  if (!selectedText.trim()) throw new Error('No hay texto seleccionado.')

  const apiKey = await getApiKey(provider)
  const model = await getModel(provider)
  const prompt = `Resume el siguiente texto de forma concisa (máx. 3 puntos clave):\n\n${selectedText}`

  const messages: ChatMessage[] = [
    { role: 'system', content: 'Eres un asistente experto en síntesis de información. Responde en el mismo idioma del texto.' },
    { role: 'user', content: prompt },
  ]

  const result = await callAI(provider, messages, apiKey, model)
  await logToHistory(provider, prompt, result)
  return result.text
}

// ── Flujo C: Prompt libre con contexto opcional ────────────
export async function runPromptWithContext(
  prompt: string,
  provider: Provider,
  context?: PageContext,
): Promise<string> {
  const apiKey = await getApiKey(provider)
  const model = await getModel(provider)

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: context
        ? `Eres un asistente de IA. Tienes acceso al contexto de la siguiente página:\n\n${formatPageContextForPrompt(context)}`
        : 'Eres un asistente de IA útil y preciso.',
    },
    { role: 'user', content: prompt },
  ]

  const result = await callAI(provider, messages, apiKey, model)
  await logToHistory(provider, prompt, result)
  return result.text
}

// ── Flujo D: MCP Tool → IA (interpretación) ────────────────
export async function runMcpThenAI(
  client: McpClient,
  toolName: string,
  toolArgs: Record<string, unknown>,
  provider: Provider,
): Promise<{ mcpResult: string; aiInterpretation: string }> {
  const rawMcpResult = await client.callTool(toolName, toolArgs)
  const parsed = parseMcpResponse(rawMcpResult)

  let aiInterpretation = ''
  try {
    const apiKey = await getApiKey(provider)
    const model = await getModel(provider)
    const prompt = `Interpreta el siguiente resultado de la herramienta "${toolName}" de forma clara y útil:\n\n${parsed.rawText}`
    const result = await callAI(provider, [
      { role: 'system', content: 'Eres un asistente que interpreta resultados de herramientas MCP.' },
      { role: 'user', content: prompt },
    ], apiKey, model)
    aiInterpretation = result.text
    await logToHistory(provider, prompt, result)
  } catch {
    // Si no hay API Key, devolver solo el resultado MCP
  }

  return { mcpResult: parsed.rawText, aiInterpretation }
}

// ── Flujo E: Modo Agente (tool_use loop) ──────────────────
export async function runAgentLoop(
  userTask: string,
  provider: Provider,
  client: McpClient,
  maxIterations = 5,
): Promise<{ finalAnswer: string; toolCallsUsed: number }> {
  const apiKey = await getApiKey(provider)
  const model = await getModel(provider)
  const tools = await client.listTools()

  const toolDescriptions = tools.map(t =>
    `- ${t.name}: ${t.description ?? 'Sin descripción'}`
  ).join('\n')

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un agente de IA que puede usar las siguientes herramientas MCP para completar tareas.
Herramientas disponibles:
${toolDescriptions}

Para usar una herramienta, responde ÚNICAMENTE con JSON en este formato:
{"tool": "nombre_herramienta", "args": {"param": "valor"}}

Si ya tienes la respuesta final, responde con texto normal (no JSON).`,
    },
    { role: 'user', content: userTask },
  ]

  let toolCallsUsed = 0
  let finalAnswer = ''

  for (let i = 0; i < maxIterations; i++) {
    const response = await callAI(provider, messages, apiKey, model)
    const text = response.text.trim()

    // Intentar parsear como tool call
    try {
      const toolCall = JSON.parse(text) as { tool: string; args: Record<string, unknown> }
      if (typeof toolCall.tool === 'string') {
        const mcpResult = await client.callTool(toolCall.tool, toolCall.args ?? {})
        const parsed = parseMcpResponse(mcpResult)
        toolCallsUsed++

        messages.push({ role: 'assistant', content: text })
        messages.push({
          role: 'user',
          content: `Resultado de ${toolCall.tool}:\n${parsed.rawText}`,
        })
        continue
      }
    } catch {
      // No es JSON → es la respuesta final
    }

    finalAnswer = text
    break
  }

  if (!finalAnswer) {
    finalAnswer = 'El agente alcanzó el límite de iteraciones sin respuesta final.'
  }

  return { finalAnswer, toolCallsUsed }
}
