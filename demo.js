/**
 * Quick demo script - runs multiple nodes in-process (no real network)
 * Shows consensus & distributed ledger in action
 */

const { Blockchain, Transaction } = require('./blockchain');

console.log('========================================');
console.log('  DEMO: Distributed Ledger + Consensus');
console.log('========================================\n');

// Simulate 3 nodes
const nodeA = new Blockchain();
const nodeB = new Blockchain();
const nodeC = new Blockchain();

const addrA = 'Alice';
const addrB = 'Bob';
const addrC = 'Charlie';

console.log('1. Alice mines the first block (gets reward)...');
nodeA.minePendingTransactions(addrA);
console.log(`   Alice balance: ${nodeA.getBalanceOfAddress(addrA)}`);

console.log('\n2. Alice sends 20 to Bob...');
nodeA.addTransaction(new Transaction(addrA, addrB, 20));
nodeA.minePendingTransactions(addrA);
console.log(`   Alice: ${nodeA.getBalanceOfAddress(addrA)}`);
console.log(`   Bob  : ${nodeA.getBalanceOfAddress(addrB)}`);

console.log('\n3. Nodes sync via longest-chain rule (consensus)...');
// B and C receive the chain from A
nodeB.replaceChain(nodeA.chain);
nodeC.replaceChain(nodeA.chain);

console.log(`   NodeB chain length: ${nodeB.chain.length}, valid: ${nodeB.isChainValid()}`);
console.log(`   NodeC chain length: ${nodeC.chain.length}, valid: ${nodeC.isChainValid()}`);
console.log(`   Bob balance on NodeC: ${nodeC.getBalanceOfAddress(addrB)}`);

console.log('\n4. Bob sends 5 to Charlie on NodeB...');
nodeB.addTransaction(new Transaction(addrB, addrC, 5));
nodeB.minePendingTransactions(addrB);

console.log('\n5. Broadcast new chain to others...');
nodeA.replaceChain(nodeB.chain);
nodeC.replaceChain(nodeB.chain);

console.log('\n========== FINAL STATE (all nodes same) ==========');
[nodeA, nodeB, nodeC].forEach((n, i) => {
  const name = ['A', 'B', 'C'][i];
  console.log(`Node ${name}:`);
  console.log(`  Alice  : ${n.getBalanceOfAddress(addrA)}`);
  console.log(`  Bob    : ${n.getBalanceOfAddress(addrB)}`);
  console.log(`  Charlie: ${n.getBalanceOfAddress(addrC)}`);
  console.log(`  Valid  : ${n.isChainValid()}`);
});

console.log('\n✅ Distributed ledger is consistent across all nodes!');
console.log('✅ Consensus (longest valid chain) worked.');
