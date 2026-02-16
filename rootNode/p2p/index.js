/** @format */

const dotenv = require('dotenv');
const WebSocket = require('ws');
const Transaction = require("../transaction");

dotenv.config();

class PubSub {
    constructor({ blockchain, transactionPool, stateDatabase, wsServer, peers = [] }) {
        if (!blockchain || !transactionPool || !stateDatabase || !wsServer) {
            throw new Error("Missing required parameters");
        }
        
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.stateDatabase = stateDatabase;
        this.peers = new Set(peers);
        this.sockets = new Map(); // Map of socket instances to their URLs
        this.messageQueue = new Map(); // Track messages to prevent loops
        this.wsServer = wsServer;

        // this.selfAddress = null;
        this.initServer();
        this.connectToPeers();
    }

    initServer() {
        this.wsServer.on('connection', (socket, req) => {
            const serverAddress = this.wsServer._server.address();
            const port = serverAddress.port;
            const peerUrl = `${req.socket.remoteAddress.replace('::ffff:', '')}:${port}`;
            
            console.log(`New connection from ${peerUrl}`);
            this.peers.add(peerUrl);
            this.setupSocket(socket, peerUrl);
            this.sharePeers(socket);
        });
    
        console.log(`WebSocket endpoint attached to existing HTTP server`);
    }

    // getNodeAddress() {
    //     const serverAddress = this.httpServer.address();
    //     if (!serverAddress) throw new Error("Server not bound to a port");
      
    //     // Environment variable override (supports domain names)
    //     if (process.env.NODE_PUBLIC_ADDRESS) {
    //       return process.env.NODE_PUBLIC_ADDRESS.includes(':') 
    //         ? process.env.NODE_PUBLIC_ADDRESS 
    //         : `${process.env.NODE_PUBLIC_ADDRESS}:${serverAddress.port}`;
    //     }
      
    //     // Handle 0.0.0.0/:: bindings
    //     if (['0.0.0.0', '::'].includes(serverAddress.address)) {
    //       const interfaces = Object.values(require('os').networkInterfaces()).flat();
    //       const externalInterface = interfaces.find(int => 
    //         !int.internal && int.family === 'IPv4'
    //       );
      
    //       if (externalInterface) {
    //         return `${externalInterface.address}:${serverAddress.port}`;
    //       }
    //     }
      
    //     // Explicit IP binding (e.g., 192.168.1.5:3000)
    //     return `${serverAddress.address}:${serverAddress.port}`;
    // }

    async handleConnection(socket, req) {
        const peerUrl = req.socket.remoteAddress.replace('::ffff:', '') + ':' + this.port;
        console.log(`New connection from ${peerUrl}`);

        // Add to peers list
        this.peers.add(peerUrl);
        this.setupSocket(socket, peerUrl);

        // Share known peers with new connection
        this.sharePeers(socket);
    }

    setupSocket(socket, url) {
        this.sockets.set(socket, url);

        socket.on('message', data => this.handleMessage(data, socket));
        socket.on('close', () => this.handleDisconnect(socket));
        socket.on('error', err => console.error(`Socket error: ${err}`));
    }

    handleDisconnect(socket) {
        const url = this.sockets.get(socket);
        console.log(`Disconnected from ${url}`);
        this.sockets.delete(socket);
        this.peers.delete(url);
    }

    async connectToPeer(peer) {
        // const serverPort = this.wsServer._server.address().port;
        const serverPort = process.env.PORT || 10000; // used fixed value
        if (peer.endsWith(`:${serverPort}`)) return; // Don't connect to self
        
        const socket = new WebSocket(`ws://${peer}`);
        
        socket.on('open', () => {
            console.log(`Connected to peer: ${peer}`);
            this.setupSocket(socket, peer);
            this.sharePeers(socket);
        });
    
        socket.on('error', (err) => {
            console.error(`Connection to ${peer} failed: ${err.message}`);
            this.reconnectPeer(peer);
        });
    }

    reconnectPeer(peer) {
        setTimeout(() => {
            if (!this.sockets.has(peer)) {
                console.log(`Reconnecting to ${peer}...`);
                this.connectToPeer(peer);
            }
        }, 5000);
    }

    connectToPeers() {
        this.peers.forEach(peer => this.connectToPeer(peer));
    }

    sharePeers(socket) {
        const peersMessage = JSON.stringify({
            type: 'PEERS',
            data: Array.from(this.peers)
        });
        socket.send(peersMessage);
    }

    async handleMessage(rawData, senderSocket) {
        try {
            const { type, data, messageId } = JSON.parse(rawData);
            
            // Prevent message loops
            if (this.messageQueue.has(messageId)) return;
            this.messageQueue.set(messageId, true);
            setTimeout(() => this.messageQueue.delete(messageId), 10000);

            console.log(`Received ${type} message`);
            
            switch(type) {
                case 'BLOCKCHAIN':
                    await this.handleBlockchainMessage(data);
                    break;
                case 'TRANSACTION':
                    this.handleTransactionMessage(data);
                    break;
                case 'PEERS':
                    this.handlePeerList(data);
                    break;
                default:
                    console.warn(`Unknown message type: ${type}`);
            }
            
            // Broadcast to other peers (excluding sender)
            this.broadcast(rawData, senderSocket);
        } catch (error) {
            console.error(`Error handling message: ${error}`);
        }
    }

    async handleBlockchainMessage(chainData) {
        try {
            const parsedChain = JSON.parse(chainData).map(blockData => {
                // Rehydrate block with Merkle root validation
                return new Block({
                    ...blockData,
                    transactions: blockData.transactions.map(tx => Transaction.fromObject(tx))
                });
            });

            // Validate Merkle roots for each block
            if (!this.validateIncomingChain(parsedChain)) {
                console.error('Received chain with invalid Merkle roots');
                return;
            }

            await this.blockchain.replaceChain({
                chain: parsedChain,
                validateTransactions: true,
                stateDatabase: this.stateDatabase,
                onSuccess: () => {
                    this.transactionPool.clearBlockchainTransactions({ chain: parsedChain });
                }
            });
        } catch (error) {
            throw new Error(`Error processing chain: ${error}`);
        }
    }

    validateIncomingChain(chain) {
        for (const block of chain) {
            if (!this.validateBlockMerkleRoot(block)) {
                console.error(`Block ${block.hash} has invalid Merkle root`);
                return false;
            }
        }
        return true;
    }

    validateBlockMerkleRoot(block) {
        // Rebuild the Merkle trie from block transactions
        const localTrie = new MerkleTrie();
        const sortedTransactions = [...block.transactions].sort((a, b) => a.id.localeCompare(b.id));
        
        sortedTransactions.forEach(tx => {
            localTrie.insert(tx.id, JSON.stringify(tx));
        });

        // Compare with the block's stored Merkle root
        if (localTrie.root.hash !== block.merkleRoot) {
            console.error(`Merkle root mismatch:
                Local: ${localTrie.root.hash}
                Remote: ${block.merkleRoot}
            `);
            return false;
        }

        return true;
    }

    handleTransactionMessage(transactionData) {
        const transaction = Transaction.fromObject(JSON.parse(transactionData));
        this.transactionPool.setTransaction(transaction);
    }

    handlePeerList(peers) {
        peers.forEach(peer => {
            if (!this.peers.has(peer) && peer !== this.selfAddress) {
                this.peers.add(peer);
                this.connectToPeer(peer);
            }
        });
    }

    broadcast(message, excludeSocket = null) {
        this.sockets.forEach((url, socket) => {
            if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
                socket.send(message);
            }
        });
    }

    createMessage(type, data) {
        return JSON.stringify({
            type,
            data: JSON.stringify(data),
            messageId: Date.now().toString(36) + Math.random().toString(36).substr(2)
        });
    }

    broadcastChain() {
        const message = this.createMessage('BLOCKCHAIN', this.blockchain.chain);
        this.broadcast(message);
    }

    broadcastTransaction(transaction) {
        const message = this.createMessage('TRANSACTION', transaction);
        this.broadcast(message);
    }
}

module.exports = PubSub;