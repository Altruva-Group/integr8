require("dotenv").config();
const express = require("express");
const getInstances = require("../../common");
const {blockchain, pubsub, transactionPool, transactionMiner, stateDatabase} = getInstances();

// const {blockchain, pubsub, transactionPool, transactionMiner, stateDatabase} = require("./../../common")

const app = express.Router();

// blockchain routes
app.get("/blocks", (req, res) => {
    console.log("HERE....")
    console.log(blockchain.chain);
    res.status(200).json({
        type: "success",
        message: "Blockchain data fetched",
        blockchain: blockchain.chain.map(block => ({
            timestamp: block.timestamp,
            lastHash: block.lastHash,
            hash: block.hash,
            transactions: block.transactions,
            merkleRoot: block.merkleRoot,  // Include only the Merkle Root
            // legacy fields removed: nonce/difficulty (auto-mined)
        }))
    });
});

// Deprecated endpoint for manual mining. Kept for backwards compatibility.
app.get("/blocks/mine-transactions", (req, res) => {
    // Check if there are transactions in the transaction pool
    const transactionPoolSize = Object.keys(transactionPool.transactionMap).length;

    if (transactionPoolSize > 0) {
        transactionMiner.mineTransactions(stateDatabase, blockchain);
        return res.redirect("/api/blockchain/blocks");
    }

    return res.status(400).json({
        type: "error",
        message: "No blockchain transactions to include",
    });
});

app.get("/blocks/length", (req, res) => {
    res.status(200).json({
        type: "success",
        message: "Blockchain length fetched",
        blockchain: blockchain.chain.length
    });
});

app.get("/blocks/mempool", (req, res) => {
    // console.log("MEMPOOL")
    res.status(200).json({
        type: "success",
        message: "Blockchain transaction pool records fetched",
        transactionPool: transactionPool.transactionMap
    });
});

app.get("/blocks/scan/:id", (req, res) => {
    const { id } = req.params;
    const { chain } = blockchain;
    let foundTransaction = null;
    let foundTransactions = [];

    for (let block of chain) {
        for (let transaction of block.transactions) {
            if (transaction.id === id) {
                foundTransaction = transaction;
                break;
            }

            if (transaction.input.address === id || transaction.outputMap[id] !== undefined) {
                foundTransactions.push(transaction);
            }
        }
        if (foundTransaction) break;
    }

    if (foundTransaction) {
        res.status(200).json({
            type: "success",
            message: "Transaction found",
            transaction: foundTransaction
        });
    } else if (foundTransactions.length > 0) {
        res.status(200).json({
            type: "success",
            message: "Transactions found",
            transaction: foundTransactions
        });
    } else {
        res.status(404).json({
            type: "error",
            message: "No record found."
        });
    }
});

app.get("/blocks/:id", (req, res) => {
    const { id } = req.params;
    const { length } = blockchain.chain;

    const blocksReversed = blockchain.chain.slice().reverse();

    let startIndex = (id - 1) * 5;
    let endIndex = id * 5;

    startIndex = startIndex < length ? startIndex : length;
    endIndex = endIndex < length ? endIndex : length;

    res.status(200).json({
        type: "success",
        message: "Blockchain paginated data fetched",
        blockchain: blocksReversed.slice(startIndex, endIndex)
    });
});

app.get("/blocks/peers", (req, res) => {
    const peers = Array.from(pubsub.peers).map(peer => peer.split(":")[1]);
    res.status(200).json({
        type: "success",
        message: "Peer list fetched",
        peers: peers
    });
});

app.get("/blocks/peers/:peer", (req, res) => {
    const { peer } = req.params;
    const peers = Array.from(pubsub.peers).map(peer => peer.split(":")[1]);
    const peerIndex = peers.indexOf(peer);

    if (peerIndex !== -1) {
        res.status(200).json({
            type: "success",
            message: "Peer found",
            peer: peers[peerIndex]
        });
    } else {
        res.status(404).json({
            type: "error",
            message: "Peer not found"
        });
    }
});

app.get("/blocks/peers/:peer/transactions", (req, res) => {
    const { peer } = req.params;
    const peers = Array.from(pubsub.peers).map(peer => peer.split(":")[1]);
    const peerIndex = peers.indexOf(peer);

    if (peerIndex !== -1) {
        const transactions = Object.values(transactionPool.transactionMap).filter(tx => tx.input.address === peer || tx.outputMap[peer] !== undefined);
        res.status(200).json({
            type: "success",
            message: "Transactions found for peer",
            transactions: transactions
        });
    } else {
        res.status(404).json({
            type: "error",
            message: "Peer not found"
        });
    }
}); 

app.get("/blocks/peers/:peer/transactions/:id", (req, res) => {
    const { peer, id } = req.params;
    const peers = Array.from(pubsub.peers).map(peer => peer.split(":")[1]);
    const peerIndex = peers.indexOf(peer);

    if (peerIndex !== -1) {
        const transactions = Object.values(transactionPool.transactionMap).filter(tx => tx.input.address === peer || tx.outputMap[peer] !== undefined);
        const transaction = transactions.find(tx => tx.id === id);

        if (transaction) {
            res.status(200).json({
                type: "success",
                message: "Transaction found for peer",
                transaction: transaction
            });
        } else {
            res.status(404).json({
                type: "error",
                message: "Transaction not found for peer"
            });
        }
    } else {
        res.status(404).json({
            type: "error",
            message: "Peer not found"
        });
    }
});

app.get("/blocks/peers/:peer/transactions/:id/confirmations", (req, res) => {
    const { peer, id } = req.params;
    const peers = Array.from(pubsub.peers).map(peer => peer.split(":")[1]);
    const peerIndex = peers.indexOf(peer);

    if (peerIndex !== -1) {
        const transactions = Object.values(transactionPool.transactionMap).filter(tx => tx.input.address === peer || tx.outputMap[peer] !== undefined);
        const transaction = transactions.find(tx => tx.id === id);

        if (transaction) {
            res.status(200).json({
                type: "success",
                message: "Transaction confirmations found for peer",
                confirmations: transaction.confirmations
            });
        } else {
            res.status(404).json({
                type: "error",
                message: "Transaction not found for peer"
            });
        }
    } else {
        res.status(404).json({
            type: "error",
            message: "Peer not found"
        });
    }
}); 

app.get("/block/:hash", (req, res) => {
    const { hash } = req.params;
    const block = blockchain.chain.find(block => block.hash === hash);

    if (block) {
        res.status(200).json({
            type: "success",
            message: "Block found",
            block: {
                timestamp: block.timestamp,
                lastHash: block.lastHash,
                hash: block.hash,
                transactions: block.transactions,
                merkleRoot: block.merkleRoot
            }
        });
    } else {
        res.status(404).json({
            type: "error",
            message: "Block not found"
        });
    }
});

app.get("/block/:hash/transactions", (req, res) => {
    const { hash } = req.params;
    const block = blockchain.chain.find(block => block.hash === hash);

    if (block) {
        res.status(200).json({
            type: "success",
            message: "Block transactions found",
            transactions: block.transactions
        });
    } else {
        res.status(404).json({
            type: "error",
            message: "Block not found"
        });
    }
});

app.get("/block/:hash/transactions/:id", (req, res) => {
    const { hash, id } = req.params;
    const block = blockchain.chain.find(block => block.hash === hash);

    if (block) {
        const transaction = block.transactions.find(tx => tx.id === id);

        if (transaction) {
            res.status(200).json({
                type: "success",
                message: "Transaction found in block",
                transaction: transaction
            });
        } else {
            res.status(404).json({
                type: "error",
                message: "Transaction not found in block"
            });
        }
    } else {
        res.status(404).json({
            type: "error",
            message: "Block not found"
        });
    }
});




module.exports = app