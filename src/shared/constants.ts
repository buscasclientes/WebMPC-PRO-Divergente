// ============================================================
// WebMCP – Constantes globales
// ============================================================

export const EXTENSION_NAME = 'WebMCP'
export const EXTENSION_VERSION = '1.0.0'

// ── Storage keys ─────────────────────────────────────────────
export const STORAGE_KEYS = {
  AI_CONFIGS:          'webmcp_ai_configs',
  ACTIVE_PROVIDER:     'webmcp_active_provider',
  MCP_SERVERS:         'webmcp_mcp_servers',
  HISTORY:             'webmcp_history',
  DEBUG_MODE:          'webmcp_debug_mode',
  MAX_HISTORY_ENTRIES: 'webmcp_max_history',
  THEME:               'webmcp_theme',
  CRYPTO_SALT:         'webmcp_crypto_salt',
} as const

// ── Defaults ─────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  activeProvider:     'gemini' as const,
  debugMode:          false,
  maxHistoryEntries:  200,
  theme:              'dark' as const,
}

export const DEFAULT_MODELS: Record<string, string> = {
  gemini:  'gemini-2.5-flash',
  claude:  'claude-3-5-sonnet-20241022',
  openai:  'gpt-4o',
}

export const DEFAULT_MAX_TOKENS = 4096
export const DEFAULT_TEMPERATURE = 0.7

// ── API endpoints ─────────────────────────────────────────────
export const API_ENDPOINTS = {
  gemini:  'https://generativelanguage.googleapis.com/v1beta',
  claude:  'https://api.anthropic.com/v1',
  openai:  'https://api.openai.com/v1',
} as const

// ── MCP ──────────────────────────────────────────────────────
export const MCP_VERSION        = '2024-11-05'
export const MCP_TIMEOUT_MS     = 30_000
export const WS_RECONNECT_DELAY = 3_000

// ── Extracción DOM ───────────────────────────────────────────
export const MAX_PAGE_TEXT_CHARS = 8_000
export const MAX_SELECTED_TEXT   = 2_000

// ── UI ───────────────────────────────────────────────────────
export const SIDE_PANEL_WIDTH   = 400
export const ANIMATION_DURATION = 200     // ms
