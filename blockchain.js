/**
 * Simple Blockchain Core
 * - Blocks with transactions
 * - Proof-of-Work consensus
 * - Distributed ledger (balances + history)
 */

const CryptoJS = require('crypto-js');

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = Date.now();
    this.txId = CryptoJS.SHA256(
      fromAddress + toAddress + amount + this.timestamp
    ).toString();
  }
}

class Block {
  constructor(index, timestamp, transactions, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return CryptoJS.SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce
    ).toString();
  }

  // Proof-of-Work: find nonce so hash starts with difficulty zeros
  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`  Block mined: ${this.hash}`);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2; // low for demo
    this.pendingTransactions = [];
    this.miningReward = 50;
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Mine pending transactions into a new block
  minePendingTransactions(miningRewardAddress) {
    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );

    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }
    if (transaction.amount <= 0) {
      throw new Error('Amount must be > 0');
    }
    // Simple balance check (for real systems more complex)
    if (transaction.fromAddress !== null) {
      const balance = this.getBalanceOfAddress(transaction.fromAddress);
      if (balance < transaction.amount) {
        throw new Error('Not enough balance');
      }
    }
    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) {
          balance -= tx.amount;
        }
        if (tx.toAddress === address) {
          balance += tx.amount;
        }
      }
    }
    return balance;
  }

  // Full transaction history for an address
  getTransactionHistory(address) {
    const history = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          history.push({
            ...tx,
            blockIndex: block.index,
            blockHash: block.hash
          });
        }
      }
    }
    return history;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) {
        return false;
      }
      if (current.previousHash !== previous.hash) {
        return false;
      }
    }
    return true;
  }

  // Replace chain if longer & valid (longest chain rule - simple consensus)
  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      console.log('Received chain is not longer. Ignoring.');
      return false;
    }
    if (!this.isValidChain(newChain)) {
      console.log('Received chain is invalid. Ignoring.');
      return false;
    }
    console.log('Replacing chain with longer valid chain.');
    this.chain = newChain;
    return true;
  }

  isValidChain(chain) {
    // Check genesis
    if (JSON.stringify(chain[0]) !== JSON.stringify(this.createGenesisBlock()) &&
        chain[0].previousHash !== '0') {
      // allow slightly different genesis timestamp
    }
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];
      const recalculated = CryptoJS.SHA256(
        current.index +
          current.previousHash +
          current.timestamp +
          JSON.stringify(current.transactions) +
          current.nonce
      ).toString();
      if (current.hash !== recalculated) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }

  // Serialize for network
  toJSON() {
    return {
      chain: this.chain,
      pendingTransactions: this.pendingTransactions,
      difficulty: this.difficulty,
      miningReward: this.miningReward
    };
  }

  // Load from network
  fromJSON(data) {
    this.chain = data.chain.map(b => {
      const block = new Block(b.index, b.timestamp, b.transactions, b.previousHash);
      block.nonce = b.nonce;
      block.hash = b.hash;
      return block;
    });
    this.pendingTransactions = data.pendingTransactions || [];
    this.difficulty = data.difficulty || 2;
    this.miningReward = data.miningReward || 50;
  }
}

module.exports = { Blockchain, Transaction, Block };
