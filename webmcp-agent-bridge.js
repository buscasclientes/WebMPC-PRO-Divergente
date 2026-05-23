/**
 * WebMCP Agent Bridge
 * Connects Cursor, Claude Code, and Antigravity agents directly to your Chrome browser active tab.
 * Implements a zero-dependency stdio MCP server for the AI agents, and a WebSocket server for the Chrome extension.
 * 
 * Run using: node webmcp-agent-bridge.js
 */

const http = require('http');
const crypto = require('crypto');

const PORT = 9000;
console.error(`--- WebMCP Agent Bridge ---`);
console.error(`Starting Agent WebSocket server on ws://localhost:${PORT}...`);

// Keep track of active WebSocket connections (normally just 1 Chrome extension)
let extensionSocket = null;
const pendingRequests = new Map();

// Helper to write JSON-RPC messages to stdio (standard output) for the AI agent
function sendToAgent(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

// ── WebSocket Server (Zero-Dependency) ────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebMCP Agent Bridge Active. Connect the Chrome Extension to ws://localhost:9000');
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
  );

  console.error('[Bridge] Chrome Extension connected over WebSocket!');
  extensionSocket = socket;

  let bufferAccumulator = Buffer.alloc(0);

  socket.on('data', (buffer) => {
    bufferAccumulator = Buffer.concat([bufferAccumulator, buffer]);
    processBuffer();
  });

  socket.on('close', () => {
    console.error('[Bridge] Chrome Extension disconnected.');
    if (extensionSocket === socket) {
      extensionSocket = null;
    }
  });

  socket.on('error', (err) => {
    console.error('[Bridge] WS socket error:', err.message);
  });

  function processBuffer() {
    if (bufferAccumulator.length < 2) return;

    const firstByte = bufferAccumulator[0];
    const secondByte = bufferAccumulator[1];
    
    const opCode = firstByte & 0x0f;
    if (opCode === 8) {
      socket.end();
      return;
    }

    const isMasked = (secondByte & 128) === 128;
    let lengthIndicator = secondByte & 127;
    let offset = 2;
    let payloadLength = lengthIndicator;

    if (lengthIndicator === 126) {
      if (bufferAccumulator.length < 4) return;
      payloadLength = bufferAccumulator.readUInt16BE(2);
      offset = 4;
    } else if (lengthIndicator === 127) {
      if (bufferAccumulator.length < 10) return;
      payloadLength = Number(bufferAccumulator.readBigUInt64BE(2));
      offset = 10;
    }

    const totalFrameLength = offset + (isMasked ? 4 : 0) + payloadLength;
    if (bufferAccumulator.length < totalFrameLength) return;

    let maskKey;
    if (isMasked) {
      maskKey = bufferAccumulator.slice(offset, offset + 4);
      offset += 4;
    }

    const rawPayload = bufferAccumulator.slice(offset, offset + payloadLength);
    const payload = Buffer.alloc(payloadLength);

    for (let i = 0; i < payloadLength; i++) {
      payload[i] = isMasked ? rawPayload[i] ^ maskKey[i % 4] : rawPayload[i];
    }

    bufferAccumulator = bufferAccumulator.slice(totalFrameLength);
    const messageText = payload.toString('utf8');
    handleWSMessage(messageText);

    if (bufferAccumulator.length > 0) {
      processBuffer();
    }
  }

  function handleWSMessage(messageText) {
    try {
      const data = JSON.parse(messageText);
      
      // Intercept standard MCP handshake requests from the extension
      if (data.method && data.id) {
        if (data.method === 'initialize') {
          console.error('[Bridge] Responding to initialize handshake from extension...');
          sendToExtension({
            jsonrpc: '2.0',
            id: data.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              serverInfo: {
                name: 'webmcp-agent-bridge',
                version: '1.0.0'
              }
            }
          });
          return;
        }
        if (data.method === 'tools/list') {
          console.error('[Bridge] Responding to tools/list request from extension...');
          sendToExtension({
            jsonrpc: '2.0',
            id: data.id,
            result: {
              tools: []
            }
          });
          return;
        }
      }

      // If it's a response to a tool call we forwarded
      if (data.type === 'tool_result' && data.id) {
        const pending = pendingRequests.get(data.id);
        if (pending) {
          pendingRequests.delete(data.id);
          
          if (data.error) {
            pending.reject(new Error(data.error));
          } else {
            pending.resolve(data.result);
          }
        }
      }
    } catch (err) {
      console.error('[Bridge] Error parsing WS message:', err.message);
    }
  }
});

// Send a frame to the extension over WebSocket
function sendToExtension(data) {
  if (!extensionSocket) {
    throw new Error('Chrome Extension is not connected. Open the extension and connect to ws://localhost:9000');
  }

  const payloadText = JSON.stringify(data);
  const payloadBuffer = Buffer.from(payloadText, 'utf8');
  const payloadLength = payloadBuffer.length;
  let header;

  if (payloadLength <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = payloadLength;
  } else if (payloadLength <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  extensionSocket.write(Buffer.concat([header, payloadBuffer]));
}

server.listen(PORT, () => {
  console.error(`WebSocket Bridge server running on http://localhost:${PORT}`);
});


// ── Stdio MCP Server (Interface for Cursor/Claude/Antigravity) ─
let stdioBuffer = '';

process.stdin.on('data', (chunk) => {
  stdioBuffer += chunk.toString('utf8');
  let lineIndex;
  while ((lineIndex = stdioBuffer.indexOf('\n')) !== -1) {
    const line = stdioBuffer.substring(0, lineIndex).trim();
    stdioBuffer = stdioBuffer.substring(lineIndex + 1);
    if (line) {
      handleAgentMessage(line);
    }
  }
});

async function handleAgentMessage(rawMessage) {
  try {
    const data = JSON.parse(rawMessage);
    
    if (!data.id) return; // Notification

    let response = { jsonrpc: '2.0', id: data.id };

    switch (data.method) {
      case 'initialize':
        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'webmcp-agent-bridge',
            version: '1.0.0'
          }
        };
        sendToAgent(response);
        break;

      case 'tools/list':
        response.result = {
          tools: [
            {
              name: 'get_active_page_context',
              description: 'Extracts the visible main text content, URL, title, selection, links, and metadata of the active Chrome tab.',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'simulate_click',
              description: 'Simulates a mouse click on an HTML element matching the given CSS selector in the active tab.',
              inputSchema: {
                type: 'object',
                properties: {
                  selector: { type: 'string', description: 'CSS selector of the element to click (e.g. "button#submit", "a.link-class")' }
                },
                required: ['selector']
              }
            },
            {
              name: 'fill_input',
              description: 'Fills a text field, input, or textarea matching the selector with the specified value, triggering React/Vue events.',
              inputSchema: {
                type: 'object',
                properties: {
                  selector: { type: 'string', description: 'CSS selector of the input element' },
                  value: { type: 'string', description: 'Text value to write into the input' }
                },
                required: ['selector', 'value']
              }
            },
            {
              name: 'inject_script',
              description: 'Executes arbitrary JavaScript code in the main context of the active tab and returns the result.',
              inputSchema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'The JavaScript code string to evaluate' }
                },
                required: ['code']
              }
            }
          ]
        };
        sendToAgent(response);
        break;

      case 'tools/call':
        const toolName = data.params?.name;
        const args = data.params?.arguments || {};
        
        if (!extensionSocket) {
          response.error = {
            code: -32001,
            message: 'Chrome Extension not connected. Open WebMCP, go to Agentes, and connect to ws://localhost:9000'
          };
          sendToAgent(response);
          return;
        }

        const requestId = Math.random().toString(36).substring(2, 10);
        
        // Register promise to wait for WS response from extension
        const promise = new Promise((resolve, reject) => {
          pendingRequests.set(requestId, { resolve, reject });
          // Timeout after 15 seconds to prevent hanging the agent
          setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              pendingRequests.delete(requestId);
              reject(new Error(`Timeout waiting for Chrome extension to execute tool ${toolName}`));
            }
          }, 15000);
        });

        try {
          // Forward call to Extension over WebSocket
          sendToExtension({
            type: 'execute_tool',
            tool: toolName,
            arguments: args,
            id: requestId
          });

          // Wait for extension response
          const result = await promise;
          response.result = {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          response.error = {
            code: -32603,
            message: error.message
          };
        }
        
        sendToAgent(response);
        break;

      default:
        response.error = {
          code: -32601,
          message: `Method not found: ${data.method}`
        };
        sendToAgent(response);
        break;
    }
  } catch (err) {
    console.error('[Bridge] Error handling agent message:', err.message);
  }
}
