const http = require('http');
const crypto = require('crypto');

const PORT = 8080;

console.log('--- WebMCP Mock MCP WebSocket Server ---');
console.log(`Starting mock server on ws://localhost:${PORT}...`);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebMCP Mock Server Active. Connect via WebSocket (ws://localhost:8080)');
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  // Calculate WebSocket handshake key
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

  console.log('\n[WS Client Connected]');

  let bufferAccumulator = Buffer.alloc(0);

  socket.on('data', (buffer) => {
    bufferAccumulator = Buffer.concat([bufferAccumulator, buffer]);
    processBuffer();
  });

  socket.on('close', () => {
    console.log('[WS Client Disconnected]');
  });

  socket.on('error', (err) => {
    console.error('[WS Socket Error]:', err.message);
  });

  function processBuffer() {
    if (bufferAccumulator.length < 2) return;

    const firstByte = bufferAccumulator[0];
    const secondByte = bufferAccumulator[1];
    
    const opCode = firstByte & 0x0f;
    if (opCode === 8) {
      // Connection closed by client
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

    // Slice processed frame from accumulator
    bufferAccumulator = bufferAccumulator.slice(totalFrameLength);

    const messageText = payload.toString('utf8');
    handleMessage(messageText);

    // Recursively process any remaining bytes in accumulator
    if (bufferAccumulator.length > 0) {
      processBuffer();
    }
  }

  function sendFrame(payloadText) {
    const payloadBuffer = Buffer.from(payloadText, 'utf8');
    const payloadLength = payloadBuffer.length;
    let header;

    if (payloadLength <= 125) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text frame
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

    socket.write(Buffer.concat([header, payloadBuffer]));
  }

  function handleMessage(rawMessage) {
    try {
      const data = JSON.parse(rawMessage);
      console.log('-> Received JSON-RPC:', JSON.stringify(data, null, 2));

      // Handle ping notification
      if (data.method === 'ping') {
        console.log('<- Received Ping. No response required.');
        return;
      }

      if (!data.id) return;

      let response = { jsonrpc: '2.0', id: data.id };

      switch (data.method) {
        case 'initialize':
          response.result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'Mock-MCP-Server',
              version: '1.0.0'
            }
          };
          break;

        case 'tools/list':
          response.result = {
            tools: [
              {
                name: 'get_weather',
                description: 'Obtiene el clima actual de una ubicación.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    location: { type: 'string', description: 'La ciudad (ej. Madrid, Barcelona)' }
                  },
                  required: ['location']
                }
              },
              {
                name: 'calculate_hash',
                description: 'Calcula el hash SHA-256 de un texto.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Texto a procesar' }
                  },
                  required: ['text']
                }
              }
            ]
          };
          break;

        case 'tools/call':
          const toolName = data.params?.name;
          const args = data.params?.arguments || {};
          console.log(`Executing tool: ${toolName} with args:`, args);

          if (toolName === 'get_weather') {
            const location = args.location || 'desconocida';
            response.result = {
              content: [
                {
                  type: 'text',
                  text: `☀️ Clima en ${location}: Soleado, 23°C. Viento a 12 km/h. Humedad: 45%.`
                }
              ]
            };
          } else if (toolName === 'calculate_hash') {
            const text = args.text || '';
            const hash = crypto.createHash('sha256').update(text).digest('hex');
            response.result = {
              content: [
                {
                  type: 'text',
                  text: `SHA-256: ${hash}`
                }
              ]
            };
          } else {
            response.error = {
              code: -32601,
              message: `Method not found: Tool ${toolName} not supported.`
            };
          }
          break;

        default:
          response.error = {
            code: -32601,
            message: `Method not found: ${data.method}`
          };
          break;
      }

      console.log('<- Sending JSON-RPC:', JSON.stringify(response, null, 2));
      sendFrame(JSON.stringify(response));
    } catch (err) {
      console.error('Error parsing/handling WebSocket message:', err.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}`);
  console.log('Keep this process running to test local WebSocket MCP connection in the extension.');
});
