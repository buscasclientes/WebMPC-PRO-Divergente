const KEY_STORAGE_NAME = 'webmcp_enc_key'

async function getOrCreateKey(): Promise<CryptoKey> {
  // La clave maestra se genera una vez y se almacena en chrome.storage.local
  const stored = await chrome.storage.local.get(KEY_STORAGE_NAME)
  
  if (stored[KEY_STORAGE_NAME]) {
    const keyData = new Uint8Array(stored[KEY_STORAGE_NAME])
    return crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt', 'decrypt'])
  }

  // Generar nueva clave de 256 bits
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  const exported = await crypto.subtle.exportKey('raw', key)
  await chrome.storage.local.set({ [KEY_STORAGE_NAME]: Array.from(new Uint8Array(exported)) })

  return key
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Combinar IV + ciphertext en base64
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)

  return btoa(String.fromCharCode(...combined))
}

export async function decryptApiKey(encrypted: string): Promise<string> {
  if (!encrypted) return ''
  try {
    const key = await getOrCreateKey()
    const combined = new Uint8Array(
      atob(encrypted).split('').map(c => c.charCodeAt(0))
    )

    if (combined.length < 12) {
      return ''
    }

    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('Error decrypting API Key:', err)
    return ''
  }
}
