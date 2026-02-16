const Block = require("./block.js")
const {cryptoHash} = require("./../hash")
const MerkleTrie = require("../trie/index.js");

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
        this.accounts = new Map();
        this.tokens = new Map();
        this.nfts = new Map();
    }

    addBlock ({transactions, stateDatabase, blockchain}) {
        // let merkleTrie = new MerkleTrie();

        // transactions.sort((a, b) => a.id.localeCompare(b.id));
        // for (const tx of transactions) {
        //     const value = JSON.stringify(tx);
            
        //     try {
        //         merkleTrie.insert(tx.id, value);
        //     } catch (error) {
        //         return false;
        //     }
        // }
        
        // const merkleRoot = merkleTrie.root.hash;

        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],
            transactions,
            stateDatabase,
            // merkleTrie,
            // merkleRoot, 
            blockchain
        })

        if (!this.validateBlock(newBlock)) {
            throw new Error("Invalid block: Merkle Root mismatch");
        }
        // console.log(this.validateBlock(newBlock))

        this.chain.push(newBlock)
    }

    addAccount(address, account) {
        this.accounts.set(address, account);
    }

    getAccountFromBlockchain(address) {
        return this.accounts.get(address);
    }

    replaceChain({chain, accounts, validateTransactions, stateDatabase, onSuccess}) {
        if (!Blockchain.isValidChain(chain)) {
            console.error("The incoming chain must be valid.");
            return;
        }
    
        if (validateTransactions && !this.validTransactionData({chain, stateDatabase})) {
            console.error("The incoming chain has invalid data.");
            return;
        }
    
        if (accounts) {
            this.accounts = accounts;
            console.log("Account states have been updated.");
        }
    
        // Replace the blockchain chain
        this.chain = chain;
    
        if (onSuccess) onSuccess();
    }

    validTransactionData({chain, stateDatabase}) {
        for (let i=1; i<chain.length; i++) {
            const block = chain[i]
            const transactionSet = new Set()
            for (let transaction of block.transactions) {
                try {
                    transaction.validate(stateDatabase)
                    transactionSet.add(transaction)
                } catch (error) {
                    console.log(error)
                    return false
                }
            }
        }

        return true
    }

    static isValidChain(chain) {
        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
            return false;
        }
    
        for (let i = 1; i < chain.length; i++) {
            const { timestamp, lastHash, hash, transactions, merkleRoot } = chain[i];

            if (!this.validateBlock(chain[i])) {
                return false;
            }

            const actualLastHash = chain[i - 1].hash;
            if (lastHash !== actualLastHash) return false;

            // Recompute hash using the new deterministic hashing scheme
            const validateHash = cryptoHash(timestamp, lastHash, merkleRoot);
            if (hash !== validateHash) {
                console.log("Hash mismatch detected.");
                return false;
            }
        }
    
        return true;
    }
    
    validateBlock(block) {
        const trie = new MerkleTrie();
    
        const sortedTransactions = [...block.transactions.sort((a, b) => a.id.localeCompare(b.id))];
    
        sortedTransactions.forEach(transaction => {
            const key = transaction.id;
            const value = JSON.stringify(transaction);
            trie.insert(key, value);
        });
        
        return trie.root.hash === block.merkleRoot;
    }
    
    
    

}

module.exports = Blockchain