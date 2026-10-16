/**
 * Blockchain Node
 * - Connects to relay server (P2P)
 * - Maintains its own copy of the distributed ledger
 * - Participates in consensus (PoW + longest chain)
 * - Broadcasts transactions & blocks
 */

const WebSocket = require('ws');
const { Blockchain, Transaction } = require('./blockchain');
const readline = require('readline');

const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080';
const MY_ADDRESS = process.env.ADDRESS || `node-${Math.random().toString(36).slice(2, 8)}`;

const blockchain = new Blockchain();
let ws = null;
let myId = null;
let peers = [];

function connect() {
  ws = new WebSocket(RELAY_URL);

  ws.on('open', () => {
    console.log(`\n🔗 Connected to relay as ${MY_ADDRESS}`);
    // Request current chain from network
    send({ type: 'request-chain' });
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    handleMessage(msg);
  });

  ws.on('close', () => {
    console.log('Disconnected from relay. Reconnecting in 3s...');
    setTimeout(connect, 3000);
  });

  ws.on('error', (err) => {
    console.log('Connection error:', err.message);
  });
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      myId = msg.id;
      peers = msg.peers || [];
      console.log(`My peer ID: ${myId}`);
      console.log(`Known peers: ${peers.join(', ') || 'none'}`);
      break;

    case 'peer-joined':
      if (!peers.includes(msg.id)) peers.push(msg.id);
      console.log(`Peer joined: ${msg.id}`);
      break;

    case 'peer-left':
      peers = peers.filter(p => p !== msg.id);
      console.log(`Peer left: ${msg.id}`);
      break;

    case 'request-chain':
      // Someone wants our chain
      send({
        type: 'chain-response',
        chain: blockchain.toJSON()
      });
      break;

    case 'chain-response':
      if (msg.chain) {
        const temp = new Blockchain();
        temp.fromJSON(msg.chain);
        if (blockchain.replaceChain(temp.chain)) {
          console.log('✅ Ledger updated from network (longest chain)');
          printStatus();
        }
      }
      break;

    case 'new-transaction':
      try {
        const tx = msg.transaction;
        // Reconstruct
        const t = new Transaction(tx.fromAddress, tx.toAddress, tx.amount);
        t.timestamp = tx.timestamp;
        t.txId = tx.txId;
        blockchain.addTransaction(t);
        console.log(`📥 New pending tx: ${tx.fromAddress} → ${tx.toAddress} : ${tx.amount}`);
      } catch (e) {
        // ignore invalid
      }
      break;

    case 'new-block':
      // Another node mined a block
      if (msg.block) {
        const newChain = [...blockchain.chain, msg.block];
        if (blockchain.replaceChain(newChain)) {
          console.log('✅ Accepted new block from network');
          printStatus();
        } else {
          // maybe request full chain
          send({ type: 'request-chain' });
        }
      }
      break;

    default:
      break;
  }
}

function printStatus() {
  console.log('\n========== LEDGER STATUS ==========');
  console.log(`Chain length : ${blockchain.chain.length}`);
  console.log(`Valid        : ${blockchain.isChainValid()}`);
  console.log(`My balance   : ${blockchain.getBalanceOfAddress(MY_ADDRESS)}`);
  console.log(`Pending txs  : ${blockchain.pendingTransactions.length}`);
  console.log('===================================\n');
}

function mine() {
  console.log(`⛏️  Mining block as ${MY_ADDRESS}...`);
  blockchain.minePendingTransactions(MY_ADDRESS);

  // Broadcast the new block
  const latest = blockchain.getLatestBlock();
  send({
    type: 'new-block',
    block: latest
  });

  // Also send full chain so others can sync
  send({
    type: 'chain-response',
    chain: blockchain.toJSON()
  });

  console.log('✅ Block mined & broadcasted');
  printStatus();
}

function createTransaction(to, amount) {
  try {
    const tx = new Transaction(MY_ADDRESS, to, parseFloat(amount));
    blockchain.addTransaction(tx);
    send({
      type: 'new-transaction',
      transaction: tx
    });
    console.log(`📤 Transaction created & broadcasted: ${amount} to ${to}`);
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

// Interactive CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showHelp() {
  console.log(`
Commands:
  balance          - Show my balance
  status           - Show ledger status
  history          - Show my transaction history
  tx <to> <amount> - Create transaction
  mine             - Mine pending transactions
  peers            - List known peers
  help             - Show this help
  exit             - Quit
`);
}

function prompt() {
  rl.question(`\n[${MY_ADDRESS}] > `, (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    switch (cmd) {
      case 'balance':
        console.log(`Balance: ${blockchain.getBalanceOfAddress(MY_ADDRESS)}`);
        break;
      case 'status':
        printStatus();
        break;
      case 'history':
        console.log(JSON.stringify(blockchain.getTransactionHistory(MY_ADDRESS), null, 2));
        break;
      case 'tx':
        if (parts.length < 3) {
          console.log('Usage: tx <toAddress> <amount>');
        } else {
          createTransaction(parts[1], parts[2]);
        }
        break;
      case 'mine':
        mine();
        break;
      case 'peers':
        console.log('Peers:', peers.join(', ') || 'none');
        break;
      case 'help':
        showHelp();
        break;
      case 'exit':
      case 'quit':
        process.exit(0);
        break;
      default:
        if (cmd) console.log('Unknown command. Type "help"');
    }
    prompt();
  });
}

// Start
console.log('========================================');
console.log('  Simple P2P Blockchain Node');
console.log('========================================');
console.log(`Address : ${MY_ADDRESS}`);
console.log(`Relay   : ${RELAY_URL}`);
console.log('========================================');

connect();
showHelp();
prompt();
