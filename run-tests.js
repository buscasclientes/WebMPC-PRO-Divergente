const net = require('net');
const crypto = require('crypto');

console.log('============================================================');
console.log('       WebMCP Extension — Automated Test Runner             ');
console.log('============================================================');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`[PASS] ${message}`);
  } else {
    testsFailed++;
    console.error(`[FAIL] ${message}`);
  }
}

// ── TEST 1: Cryptographic Encryption/Decryption ─────────────────
async function runCryptoTest() {
  console.log('\n--- 1. Cryptography AES-256-GCM Test ---');
  try {
    const plaintext = 'AIzaSySecretKey2026';
    
    // Generate AES key (similar to getOrCreateKey in crypto.ts)
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Encrypt
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Assert encryption succeeded and ciphertext has data
    assert(ciphertext.byteLength > 0, 'Ciphertext should not be empty');

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const decryptedText = new TextDecoder().decode(decryptedBuffer);

    assert(decryptedText === plaintext, 'Decrypted text must match plaintext exactly');
  } catch (err) {
    testsFailed++;
    console.error('[FAIL] Cryptography test threw an error:', err.message);
  }
}

// ── TEST 2: Debug Key Masking in Headers & URLs ─────────────────
function runMaskingTest() {
  console.log('\n--- 2. Debug Log Masking Test ---');
  
  // Replicating maskSensitiveHeaders function from debug.ts
  function maskSensitiveHeaders(headers) {
    const masked = { ...headers };
    const sensitiveKeys = ['x-api-key', 'authorization', 'api-key'];
    for (const k of Object.keys(masked)) {
      if (sensitiveKeys.includes(k.toLowerCase())) {
        const val = masked[k];
        masked[k] = val.slice(0, 8) + '●●●●●●●●';
      }
    }
    return masked;
  }

  // Replicating maskUrl function from debug.ts
  function maskUrl(url) {
    try {
      const u = new URL(url);
      if (u.searchParams.has('key')) {
        const key = u.searchParams.get('key');
        u.searchParams.set('key', key.slice(0, 8) + '●●●●●●●●');
      }
      return u.toString();
    } catch {
      return url;
    }
  }

  const rawHeaders = {
    'content-type': 'application/json',
    'x-api-key': 'AIzaSyA_key_1234567890',
    'Authorization': 'Bearer sk-proj-openaiKey9876543210'
  };

  const maskedHeaders = maskSensitiveHeaders(rawHeaders);
  
  assert(maskedHeaders['content-type'] === 'application/json', 'Content-type header left untouched');
  assert(maskedHeaders['x-api-key'] === 'AIzaSyA_●●●●●●●●', 'X-API-Key header successfully censored');
  assert(maskedHeaders['Authorization'] === 'Bearer s●●●●●●●●', 'Authorization header successfully censored');

  const rawUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyA_mySecretKey123';
  const maskedUrl = maskUrl(rawUrl);

  assert(decodeURIComponent(maskedUrl).includes('key=AIzaSyA_●●●●●●●●'), 'URL Query key parameter successfully censored');
}

// ── TEST 3: WebSocket MCP Handshake (TCP level connection) ────────
function runWebsocketHandshakeTest() {
  console.log('\n--- 3. Localhost WebSocket MCP Handshake Test ---');
  
  return new Promise((resolve) => {
    const client = net.createConnection({ port: 8080 }, () => {
      // Send a valid WebSocket HTTP Upgrade Request
      const key = crypto.randomBytes(16).toString('base64');
      client.write(
        'GET / HTTP/1.1\r\n' +
        'Host: localhost:8080\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Key: ${key}\r\n` +
        'Sec-WebSocket-Version: 13\r\n\r\n'
      );
    });

    client.on('data', (data) => {
      const responseText = data.toString('utf8');
      
      // Check if the mock server replied with 101 Switching Protocols
      const statusLine = responseText.split('\r\n')[0];
      const hasSwitchingProtocols = responseText.includes('HTTP/1.1 101 Switching Protocols');
      const hasUpgradeHeader = responseText.includes('Upgrade: websocket');
      const hasAcceptHeader = responseText.includes('Sec-WebSocket-Accept');

      assert(hasSwitchingProtocols, `Server handshake response: "${statusLine}"`);
      assert(hasUpgradeHeader, 'Handshake response contains "Upgrade: websocket"');
      assert(hasAcceptHeader, 'Handshake response contains "Sec-WebSocket-Accept" header');

      client.end();
      resolve();
    });

    client.on('error', (err) => {
      testsFailed++;
      console.error('[FAIL] Could not connect to localhost:8080. Ensure the mock server is running.');
      resolve();
    });
  });
}

// ── RUN ALL TESTS ────────────────────────────────────────────────
async function main() {
  await runCryptoTest();
  runMaskingTest();
  await runWebsocketHandshakeTest();

  console.log('\n============================================================');
  console.log(`Test Execution Finished. Passed: ${testsPassed}, Failed: ${testsFailed}`);
  console.log('============================================================');
  
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(console.error);
