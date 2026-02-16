const getInstances = require("../common");

class TransactionPool {
    constructor () {
        this.transactionMap = {};
    }

    clear() {
        this.transactionMap = {}
    }

    setTransaction(transaction) {
        // console.log("transaction:::", {transaction})
        if (!/^[0-9a-fA-F]+$/.test(transaction.id)) {
            return null;
        }
        
        this.transactionMap[transaction.id] = transaction
        // console.log("transactionPoolMap:", this.transactionMap)

        // Auto-mine when a transaction is added (no miners required)
        try {
            const instances = getInstances();
            const transactionMiner = instances.transactionMiner;
            const stateDatabase = instances.stateDatabase;
            const blockchain = instances.blockchain;

            if (transactionMiner && typeof transactionMiner.mineTransactions === 'function') {
                // Fire-and-forget: auto include valid transactions into a block
                transactionMiner.mineTransactions(stateDatabase, blockchain);
            }
        } catch (err) {
            // ensure this does not break transaction submission
            console.error('Auto-mine failed:', err && err.message ? err.message : err);
        }
    }

    setMaxIdleHTTPParsers(transactionMap) {
        this.transactionMap = transactionMap
    }

    existingTransaction({inputAddress}) {
        const transactions = Object.values(this.transactionMap);
    
        const filteredTransactions = transactions.filter(transaction => transaction.from === inputAddress);
    
        if (filteredTransactions.length === 0) {
            return null;
        }
    
        filteredTransactions.sort((a, b) => b.nonce - a.nonce);
    
        return filteredTransactions[0];
    }

    validTransactions(stateDatabase, blockchain) {
        console.log('Validating transactions in pool:', {
            transactionCount: Object.keys(this.transactionMap).length
        });

        const validTxs = Object.values(this.transactionMap).filter(transaction => {
            try {
                const isValid = transaction.validate(stateDatabase, blockchain);
                console.log('Transaction validation:', {
                    txId: transaction.id,
                    type: transaction.type,
                    from: transaction.from,
                    amount: transaction.amount,
                    isValid
                });
                return isValid;
            } catch (error) {
                console.error('Transaction validation failed:', {
                    txId: transaction.id,
                    error: error.message
                });
                return false;
            }
        });

        console.log('Valid transactions:', {
            count: validTxs.length
        });

        return validTxs;
    }

    clearBlockchainTransactions({chain}) {
        for (let i=1; i<chain.length; i++) {
            const block = chain[i]

            for (let transaction of block.transactions) {
                if (this.transactionMap[transaction.id]) {
                    delete this.transactionMap[transaction.id]
                }
            }
        }
    }

}

module.exports = TransactionPool