const {cryptoHash} = require("../hash");
const {GENESIS_DATA} = require("../config");
const MerkleTrie = require("../trie");

class Block {
    constructor({timestamp, lastHash, hash, transactions, height, merkleRoot}) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.height = height;
        this.transactions = transactions;
        this.merkleRoot = merkleRoot; // store only the root
    }

    static genesis() {
        return new this(GENESIS_DATA);
    }

    // Deterministic block creation without Proof-of-Work
    static mineBlock({lastBlock, transactions = [], stateDatabase, blockchain}) {
        const lastHash = lastBlock.hash;
        const timestamp = Date.now();

        // 1. Sort transactions deterministically
        const sortedTransactions = [...transactions].sort((a, b) => a.id.localeCompare(b.id));

        // 2. Build Merkle Trie and compute root
        const merkleTrie = new MerkleTrie();
        sortedTransactions.forEach(tx => {
            merkleTrie.insert(tx.id, JSON.stringify(tx));
        });
        const merkleRoot = merkleTrie.root.hash;

        // 3. Compute block hash deterministically from timestamp, lastHash and merkleRoot
        const hash = cryptoHash(timestamp, lastHash, merkleRoot);

        // 4. Execute transactions to update state
        for (const tx of sortedTransactions) {
            tx.execute(stateDatabase, blockchain);
        }

        return new this({
            timestamp,
            lastHash,
            hash,
            transactions: sortedTransactions,
            merkleRoot
        });
    }
}

module.exports = Block;