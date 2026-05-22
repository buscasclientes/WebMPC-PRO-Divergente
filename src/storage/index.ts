// ============================================================
// WebMCP – chrome.storage.local wrapper tipado (T-08)
// ============================================================
import type { ExtensionSettings, HistoryEntry } from '../shared/types'
import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
} from '../shared/constants'

import { encryptApiKey, decryptApiKey } from './crypto'

// ── Tipos internos ───────────────────────────────────────────
type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// ── Primitiva genérica ───────────────────────────────────────
async function get<T>(key: StorageKey, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key)
  return (result[key] as T) ?? fallback
}

async function set<T>(key: StorageKey, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

async function remove(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key)
}

// ── Settings ─────────────────────────────────────────────────
export async function getSettings(): Promise<ExtensionSettings['aiConfigs']> {
  const rawConfigs = await get(STORAGE_KEYS.AI_CONFIGS, [] as ExtensionSettings['aiConfigs'])
  const decryptedConfigs = await Promise.all(
    rawConfigs.map(async (cfg) => {
      if (cfg.apiKey) {
        try {
          const decrypted = await decryptApiKey(cfg.apiKey)
          return { ...cfg, apiKey: decrypted }
        } catch {
          return { ...cfg, apiKey: '' }
        }
      }
      return cfg
    })
  )
  return decryptedConfigs
}

export async function setSettings(configs: ExtensionSettings['aiConfigs']): Promise<void> {
  const encryptedConfigs = await Promise.all(
    configs.map(async (cfg) => {
      if (cfg.apiKey) {
        try {
          const encrypted = await encryptApiKey(cfg.apiKey)
          return { ...cfg, apiKey: encrypted }
        } catch {
          return { ...cfg, apiKey: '' }
        }
      }
      return cfg
    })
  )
  await set(STORAGE_KEYS.AI_CONFIGS, encryptedConfigs)
}

export async function getActiveProvider() {
  return get(STORAGE_KEYS.ACTIVE_PROVIDER, DEFAULT_SETTINGS.activeProvider)
}

export async function setActiveProvider(provider: ExtensionSettings['activeProvider']) {
  return set(STORAGE_KEYS.ACTIVE_PROVIDER, provider)
}

export async function getDebugMode(): Promise<boolean> {
  return get(STORAGE_KEYS.DEBUG_MODE, DEFAULT_SETTINGS.debugMode)
}

export async function setDebugMode(value: boolean) {
  return set(STORAGE_KEYS.DEBUG_MODE, value)
}

export async function getTheme() {
  return get(STORAGE_KEYS.THEME, DEFAULT_SETTINGS.theme)
}

export async function setTheme(value: ExtensionSettings['theme']) {
  return set(STORAGE_KEYS.THEME, value)
}

// ── MCP Servers ──────────────────────────────────────────────
export async function getMCPServers() {
  return get(STORAGE_KEYS.MCP_SERVERS, [])
}

export async function setMCPServers(servers: ExtensionSettings['mcpServers']) {
  return set(STORAGE_KEYS.MCP_SERVERS, servers)
}

// ── History ──────────────────────────────────────────────────
export async function getHistory(): Promise<HistoryEntry[]> {
  return get(STORAGE_KEYS.HISTORY, [])
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const maxEntries = await get(
    STORAGE_KEYS.MAX_HISTORY_ENTRIES,
    DEFAULT_SETTINGS.maxHistoryEntries,
  )
  const current = await getHistory()
  const updated  = [entry, ...current].slice(0, maxEntries)
  await set(STORAGE_KEYS.HISTORY, updated)
}

export async function clearHistory(): Promise<void> {
  await remove(STORAGE_KEYS.HISTORY)
}

// ── Crypto salt (para cifrado de API Keys) ───────────────────
export async function getCryptoSalt(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CRYPTO_SALT)
  return (result[STORAGE_KEYS.CRYPTO_SALT] as string) ?? null
}

export async function setCryptoSalt(salt: string): Promise<void> {
  await set(STORAGE_KEYS.CRYPTO_SALT, salt)
}

// ── Listener de cambios ──────────────────────────────────────
export function onStorageChanged(
  callback: (changes: chrome.storage.StorageChange, area: string) => void,
) {
  chrome.storage.onChanged.addListener(callback)
  return () => chrome.storage.onChanged.removeListener(callback)
}
