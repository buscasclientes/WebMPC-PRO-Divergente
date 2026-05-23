/**
 * Test script for WebMCP Agent Bridge.
 * Verifies standard JSON-RPC 2.0 communication over stdio with the bridge.
 */

const { spawn } = require('child_process');

console.log('--- Testing WebMCP Agent Bridge via Stdio ---');

const bridge = spawn('node', ['webmcp-agent-bridge.js']);

let receivedData = '';

bridge.stdout.on('data', (chunk) => {
  receivedData += chunk.toString('utf8');
  if (receivedData.includes('\n')) {
    const lines = receivedData.split('\n');
    receivedData = lines.pop(); // Keep partial line
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('\n[BRIDGE RESPONSE]:', JSON.stringify(response, null, 2));
          if (response.id === 'test-init') {
            console.log('\n[PASS] Handshake initialize response received.');
            // Send next: tools/list
            console.log('\nSending tools/list request...');
            sendRequest({
              jsonrpc: '2.0',
              id: 'test-list',
              method: 'tools/list',
              params: {}
            });
          } else if (response.id === 'test-list') {
            console.log('\n[PASS] tools/list response received.');
            const tools = response.result?.tools || [];
            console.log(`Found ${tools.length} automation tools.`);
            const names = tools.map(t => t.name);
            console.log('Exposed Tools:', names.join(', '));
            
            if (names.includes('get_active_page_context') && names.includes('simulate_click')) {
              console.log('[PASS] Core automation tools correctly exposed!');
              console.log('\nALL TESTS PASSED SUCCESSFULLY! Closing bridge...');
              bridge.kill();
              process.exit(0);
            } else {
              console.error('[FAIL] Missing core tools.');
              bridge.kill();
              process.exit(1);
            }
          }
        } catch (e) {
          console.error('[ERROR] Failed to parse bridge response:', line, e.message);
        }
      }
    }
  }
});

bridge.stderr.on('data', (chunk) => {
  console.log('[BRIDGE Log]:', chunk.toString('utf8').trim());
});

bridge.on('close', (code) => {
  console.log(`Bridge process exited with code ${code}`);
});

// Helper to write to bridge stdin
function sendRequest(req) {
  bridge.stdin.write(JSON.stringify(req) + '\n');
}

// Start handshake
console.log('Sending initialize request...');
sendRequest({
  jsonrpc: '2.0',
  id: 'test-init',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'TestClient', version: '1.0.0' }
  }
});

// Timeout fail
setTimeout(() => {
  console.error('\n[FAIL] Test timed out after 5 seconds.');
  bridge.kill();
  process.exit(1);
}, 5000);
