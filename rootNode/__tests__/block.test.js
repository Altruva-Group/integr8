const Block = require('../blockchain/block');
const { GENESIS_DATA } = require('../config');
const { cryptoHash } = require('../hash');
const StateDB = require('../db/state');
const Blockchain = require('../blockchain');
const Transaction = require('../transaction');
const Wallet = require('../wallet');

describe('Block', () => {
  let timestamp, lastHash, hash, transactions, block, mockStateDB, blockchain;
    const wallet = new Wallet();

  beforeEach(() => {
    timestamp = Date.now();
    lastHash = 'foo-hash';
    hash = 'bar-hash';
    transactions = [];
    mockStateDB = new StateDB();
    blockchain = new Blockchain();
    block = new Block({
      timestamp,
      lastHash,
      hash,
      transactions,
      merkleRoot: cryptoHash(),
      height: 1
    });
  });

  it('has a timestamp, lastHash, hash, and transactions', () => {
    expect(block.timestamp).toEqual(timestamp);
    expect(block.lastHash).toEqual(lastHash);
    expect(block.hash).toEqual(hash);
    expect(block.transactions).toEqual(transactions);
  });

  describe('genesis()', () => {
    const genesisBlock = Block.genesis();    it('returns a Block instance', () => {
      expect(genesisBlock instanceof Block).toBe(true);
    });

    it('returns a block with genesis data values', () => {
      expect(genesisBlock.timestamp).toEqual(GENESIS_DATA.timestamp);
      expect(genesisBlock.lastHash).toEqual(GENESIS_DATA.lastHash);
      expect(genesisBlock.hash).toEqual(GENESIS_DATA.hash);
      expect(genesisBlock.transactions).toEqual(GENESIS_DATA.transactions);
      expect(genesisBlock.merkleRoot).toEqual(GENESIS_DATA.merkleRoot);
    });
  });

  describe('mineBlock()', () => {
    const lastBlock = Block.genesis();
    const transactions = [
      new Transaction({ 
        type: 'coin',
        action: 'transfer',
        nonce: 1,
        from: wallet.publicKey,
        to: 'recipient',
        amount: 50,
        signature: wallet.sign('test-data')
      })
    ];

    it('returns a Block instance', () => {
      const minedBlock = Block.mineBlock({ 
        lastBlock, 
        transactions, 
        stateDatabase: mockStateDB,
        blockchain
      });
      expect(minedBlock instanceof Block).toBe(true);
    });

    it('sets the lastHash to be the hash of the lastBlock', () => {
      const minedBlock = Block.mineBlock({ 
        lastBlock, 
        transactions,
        stateDatabase: mockStateDB,
        blockchain
      });
      expect(minedBlock.lastHash).toEqual(lastBlock.hash);
    });

    it('sets the merkleRoot based on transactions', () => {
      const minedBlock = Block.mineBlock({ 
        lastBlock, 
        transactions,
        stateDatabase: mockStateDB,
        blockchain
      });
      expect(minedBlock.merkleRoot).toBeDefined();
      expect(typeof minedBlock.merkleRoot).toBe('string');
    });

    it('creates SHA-256 hash based on proper inputs', () => {
      const minedBlock = Block.mineBlock({ 
        lastBlock, 
        transactions,
        stateDatabase: mockStateDB,
        blockchain
      });
      expect(minedBlock.hash).toEqual(
        cryptoHash(
          minedBlock.timestamp,
          lastBlock.hash,
          minedBlock.merkleRoot
        )
      );
    });

    it('sorts transactions before including them', () => {
      const tx1 = new Transaction({ 
        type: 'coin',
        action: 'transfer',
        nonce: 1,
        from: wallet.publicKey,
        to: 'recipient1',
        amount: 50,
        signature: wallet.sign('test-data')
      });
      const tx2 = new Transaction({ 
        type: 'coin',
        action: 'transfer',
        nonce: 2,
        from: wallet.publicKey,
        to: 'recipient2',
        amount: 30,
        signature: wallet.sign('test-data')
      });

      // Add transactions in random order
      const unsortedTransactions = [tx2, tx1];
      const minedBlock = Block.mineBlock({ 
        lastBlock, 
        transactions: unsortedTransactions,
        stateDatabase: mockStateDB,
        blockchain
      });

      // Verify transactions are sorted by id
      expect(minedBlock.transactions).toEqual(
        [...unsortedTransactions].sort((a, b) => a.id.localeCompare(b.id))
      );
    });

    it('executes all transactions in sorted order', () => {
      const mockExecute = jest.fn();
      const txWithMock = {
        ...transactions[0],
        execute: mockExecute,
        id: 'mock-id'
      };

      Block.mineBlock({ 
        lastBlock, 
        transactions: [txWithMock],
        stateDatabase: mockStateDB,
        blockchain
      });

      expect(mockExecute).toHaveBeenCalledWith(mockStateDB, blockchain);
    });
  });
});