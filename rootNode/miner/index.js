const Transaction = require('../transaction');

class TransactionMiner {
    constructor({ blockchain, transactionPool, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.pubsub = pubsub;
    }
    mineTransactions(stateDatabase, blockchain) {
        // Automatically include all valid transactions and create a block
        const validTransactions = this.transactionPool.validTransactions(stateDatabase, blockchain);

        if (!validTransactions || validTransactions.length === 0) return false;

        // Group and filter duplicates for determinism
        const transactionsBySender = this.groupAndFilterTransactions(validTransactions);
        const filteredTransactions = this.removeDuplicateTransactions(transactionsBySender);

        const transactionsToInclude = Object.values(filteredTransactions).flat();

        // Add the new block to the blockchain with all valid transactions
        this.blockchain.addBlock({
            transactions: transactionsToInclude,
            stateDatabase,
            blockchain
        });

        // Broadcast updated chain and clear pool
        this.pubsub.broadcastChain();
        this.transactionPool.clear();

        return true;
    }
    
// Helper function to group transactions by sender, optimize filtering with sorting
groupAndFilterTransactions(transactions) {
    // Sort transactions by sender and then by nonce
    transactions.sort((a, b) => {
        if (a.from === b.from) {
            return a.nonce - b.nonce;  // Sort by nonce for the same sender
        }
        return a.from.localeCompare(b.from);  // Sort by sender address
    });

    const filtered = {};
    const nonceMap = new Map();  // For each sender's latest nonce

    for (const tx of transactions) {
        const sender = tx.from;

        if (!nonceMap.has(sender)) {
            nonceMap.set(sender, new Map());
        }

        const senderNonceMap = nonceMap.get(sender);

        // If nonce doesn't exist or is newer, we accept the transaction
        if (!senderNonceMap.has(tx.nonce) || senderNonceMap.get(tx.nonce).timestamp < tx.timestamp) {
            senderNonceMap.set(tx.nonce, tx); // Save latest transaction for nonce
        }

        // Store filtered transactions in the result
        filtered[sender] = Array.from(senderNonceMap.values());
    }

    return filtered;
}

    
    // Helper function to remove duplicate transactions
    removeDuplicateTransactions(transactionsBySender) {
        const filtered = {};
    
        for (const [senderAddress, senderTransactions] of Object.entries(transactionsBySender)) {
            // Use a Map to store the latest transaction for each nonce
            const nonceMap = new Map();
    
            for (const tx of senderTransactions) {
                nonceMap.set(tx.nonce, tx); // Replace old tx with the latest tx of the same nonce
            }
    
            filtered[senderAddress] = Array.from(nonceMap.values());
        }
    
        return filtered;
    }
    
    
}

module.exports = TransactionMiner;
