/**
 * Relay Server (WebSocket)
 * Nodes connect here and broadcast messages to each other (P2P via relay)
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const clients = new Map(); // id -> ws

console.log(`🚀 Relay Server running on ws://localhost:${PORT}`);
console.log('Nodes can connect and talk to each other via this relay.\n');

wss.on('connection', (ws) => {
  const id = uuidv4().slice(0, 8);
  clients.set(id, ws);
  ws.id = id;

  console.log(`✅ Node connected: ${id} (total: ${clients.size})`);

  // Send welcome + list of peers
  ws.send(JSON.stringify({
    type: 'welcome',
    id,
    peers: Array.from(clients.keys()).filter(p => p !== id)
  }));

  // Notify others
  broadcast({ type: 'peer-joined', id }, id);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }

    // Attach sender
    msg.from = id;

    // Handle different message types
    switch (msg.type) {
      case 'broadcast':
      case 'new-block':
      case 'new-transaction':
      case 'request-chain':
      case 'chain-response':
      case 'mine-request':
        // Relay to all other nodes
        broadcast(msg, id);
        break;

      case 'direct':
        // Send to specific peer
        if (msg.to && clients.has(msg.to)) {
          clients.get(msg.to).send(JSON.stringify(msg));
        }
        break;

      default:
        broadcast(msg, id);
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    console.log(`❌ Node disconnected: ${id} (total: ${clients.size})`);
    broadcast({ type: 'peer-left', id });
  });

  ws.on('error', () => {
    clients.delete(id);
  });
});

function broadcast(msg, excludeId = null) {
  const data = JSON.stringify(msg);
  for (const [id, client] of clients) {
    if (id !== excludeId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
