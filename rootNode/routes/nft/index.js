require("dotenv").config();
const express = require("express");
const Transaction = require("../../transaction");
const NFT = require("../../nft");
const getAssetMarketValue = require("../../utils/getAssetsValue");
const getInstances = require("../../common");
const {blockchain, pubsub, transactionPool, stateDatabase} = getInstances();
const { BLOCKCHAIN_METADATA } = require("../../config");
const nftExistsGlobally = require("../../utils/nftExistsGlobally");

const app = express.Router();

const type = "nft";


/** NFT ROUTES **/

// //
// create 
app.post("/create", (req, res) => {
    try {
        const {wallet, name, url, description, signature} = req.body;

        if (!wallet || !name || !url || !description || !signature || typeof wallet !== "string" || typeof name !== "string" || (typeof url !== "string" && typeof url !== "object") || typeof description !== "string" || typeof signature !== "string") {
            return res.status(400).json({
                type: "error",
                message: "All fields are required, and have to be Strings"
            })
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            if (!ownerWallet) {
                throw new Error('Wallet not found');
            }

            let nft;
            // console.log({url})
            const amount = url.length;
            if (url.length > 1) {
                nft = [];
                let position = 1;
                for (const iURL of url) {
                    if (typeof iURL !== "string") throw new Error("Invalid URL supplied")
                        nft.push(new NFT({creator: wallet, owner: wallet, name, url: iURL, description, totalSupply: amount, position}))

                        position += 1;
                    }
            } else {
                nft = new NFT({
                    creator: wallet, owner: wallet, name, url: url[0], description
                })
            }

            // console.log({nft})

                        /** TO BE MOVED TO CLIENT SIDE */
                        const EC = require("elliptic").ec;
                        const cryptoHash = require("./../../hash/crypto-hash");
            
                        const ec = new EC("secp256k1");
            
                        const privateKey = process.env.PK1;
                        // Sign transaction
                        const signTransaction = ({ data, privateKey }) => {
                            // console.log("DATA:", {data})
                            const key = ec.keyFromPrivate(privateKey);
                            const signature = key.sign(cryptoHash(data), 'base64');
                            return signature.toDER('hex');
                        };
            
                        const signature1 = signTransaction({ data: { wallet, nft, amount, type, action: "create" }, privateKey });
                        // console.log({signature1})
                        /** CLIENT SIGNING ENDS */

            let tx;
            if (ownerWallet.coins >= 0.1009) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet});

                if (!existingTransaction) {
                    tx = new Transaction({
                        type,
                        action: "create",
                        from: wallet,
                        nft,
                        amount,
                        nonce: 0,
                        signature
                    })
                } else {
                    tx = Transaction.update({
                        type, 
                        action: "create",
                        from: wallet,
                        nft,
                        amount,
                        oldTransaction: existingTransaction,
                        signature
                    })
                }
                // console.log({tx})

                try {
                    tx.validate(stateDatabase, blockchain)

                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx)

                    res.status(201).json({
                        type: "success",
                        message: "NFT created, waiting for transaction to be mined",
                        transaction: tx
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: "error",
                        message: error.message
                    })
                }
            } else {
                return res.status(400).json({
                    type: "error",
                    message: "Coin balance not sufficient for this transaction"
                })
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({
                type: "error",
                message: error.message
            })
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            type: "error",
            message: "Something else went wrong"
        })
    }
})

// mint 
app.post("/mint", (req, res) => {
    try {
        const {wallet, name, url, description, creator, position, totalSupply,  signature} = req.body;

        if (!wallet || !name || !description || !signature || typeof wallet !== "string" || typeof name !== "string" || typeof description !== "string" || typeof signature !== "string") {
            return res.status(400).json({
                type: "error",
                message: "All fields are required, and have to be Strings"
            })
        }

        if (url && typeof url !== "string"){
            return res.status(400).json({
                type: "error",
                message: "Invalid asset URL supplied"
            })
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            if (!ownerWallet) {
                throw new Error('Wallet not found');
            }

            let nft;
            let amount = totalSupply;
            if (totalSupply > 1 && position !== 0) {
                nft = [];
                // const nftData = {
                //     name, url, description, owner, creator, position, totalSupply
                // }

                for (const [key, n] of ownerWallet.unmintedNfts.entries()) {
                    if (
                        n.creator === creator &&
                        n.owner === wallet &&
                        n.name === name &&
                        n.description === description &&
                        n.totalSupply === totalSupply
                    ) {
                       if (!n.frozen && !n.isMinted) nft.push(n)
                    }
                }
            } else {
                for (const [key, n] of ownerWallet.unmintedNfts.entries()) {
                    if (
                        n.creator === creator &&
                        n.owner === wallet &&
                        n.name === name &&
                        n.url === url &&
                        n.description === description &&
                        n.totalSupply === totalSupply
                    ) {
                      if (n.frozen) return res.status(400).json({
                        type: "error",
                        message: "Asset is frozen. Frozen assets can not be minted"
                      })

                      nft = n
                    }
                }
            }

            if (!nft) return res.status(404).json({
                type: "error",
                message: "Asset not found"
            })

            // console.log({nft})

                        /** TO BE MOVED TO CLIENT SIDE */
                        const EC = require("elliptic").ec;
                        const cryptoHash = require("./../../hash/crypto-hash");
            
                        const ec = new EC("secp256k1");
            
                        const privateKey = process.env.PK1;
                        // Sign transaction
                        const signTransaction = ({ data, privateKey }) => {
                            // console.log("DATA:", {data})
                            const key = ec.keyFromPrivate(privateKey);
                            const signature = key.sign(cryptoHash(data), 'base64');
                            return signature.toDER('hex');
                        };
            
                        const signature1 = signTransaction({ data: { wallet, nft, amount, type, action: "mint" }, privateKey });
                        // console.log({signature1})
                        /** CLIENT SIGNING ENDS */

            let tx;
            if (ownerWallet.coins >= 0.1009) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet});

                if (!existingTransaction) {
                    tx = new Transaction({
                        type,
                        action: "mint",
                        from: wallet,
                        nft,
                        amount,
                        nonce: 0,
                        signature
                    })
                } else {
                    tx = Transaction.update({
                        type, 
                        action: "mint",
                        from: wallet,
                        nft,
                        amount,
                        oldTransaction: existingTransaction,
                        signature
                    })
                }
                // console.log({tx})

                try {
                    tx.validate(stateDatabase, blockchain)

                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx)

                    res.status(201).json({
                        type: "success",
                        message: "transaction created",
                        transaction: tx
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: "error",
                        message: error.message
                    })
                }
            } else {
                return res.status(400).json({
                    type: "error",
                    message: "Coin balance not sufficient for this transaction"
                })
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({
                type: "error",
                message: error.message
            })
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            type: "error",
            message: "Something else went wrong"
        })
    }
})

// burn 
app.post("/burn", (req, res) => {
    try {
        const {wallet, nftCA, name, url, description, creator, position, totalSupply,  signature} = req.body;

        if (!nftCA) {
            if (!wallet || !name || !description || !signature || typeof wallet !== "string" || typeof name !== "string" || typeof description !== "string" || typeof signature !== "string") {
                return res.status(400).json({
                    type: "error",
                    message: "Asset name, url, description, creator, position, and totalSupply are required if no asset CA"
                })
            }
    
            if (url && typeof url !== "string"){
                return res.status(400).json({
                    type: "error",
                    message: "Invalid asset URL supplied"
                })
            }
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            if (!ownerWallet) {
                throw new Error('Wallet not found');
            }

            let nft;
            const amount = 1;
        
            // minted nfts
            for (const [key, n] of ownerWallet.nfts.entries()) {
                if (nftCA && nftCA === n.ca) {
                    nft = n
                } else if (
                    n.creator === creator &&
                    n.owner === wallet &&
                    n.name === name &&
                    n.url === url &&
                    n.description === description &&
                    n.position === position &&
                    n.totalSupply === totalSupply
                ) {
                    if (n.frozen) return res.status(400).json({
                    type: "error",
                    message: "Asset is frozen. Frozen assets can not be minted nor burned"
                    })

                    nft = n
                }
            }
            // unminted nfts
            if (!nft) {
                for (const [key, n] of ownerWallet.unmintedNfts.entries()) {
                    if (nftCA && nftCA === n.ca) {
                        nft = n
                    } else if (
                        n.creator === creator &&
                        n.owner === wallet &&
                        n.name === name &&
                        n.url === url &&
                        n.description === description &&
                        n.position === position &&
                        n.totalSupply === totalSupply
                    ) {
                        if (n.frozen) return res.status(400).json({
                        type: "error",
                        message: "Asset is frozen. Frozen assets can not be minted nor burned"
                        })
    
                        nft = n
                    }
                }
            }

            if (!nft) return res.status(404).json({
                type: "error",
                message: "Asset not found"
            })

                        /** TO BE MOVED TO CLIENT SIDE */
                        const EC = require("elliptic").ec;
                        const cryptoHash = require("./../../hash/crypto-hash");
            
                        const ec = new EC("secp256k1");
            
                        const privateKey = process.env.PK1;
                        // Sign transaction
                        const signTransaction = ({ data, privateKey }) => {
                            // console.log("DATA:", {data})
                            const key = ec.keyFromPrivate(privateKey);
                            const signature = key.sign(cryptoHash(data), 'base64');
                            return signature.toDER('hex');
                        };
            
                        const signature1 = signTransaction({ data: { wallet, nft, amount, type, action: "burn" }, privateKey });
                        // console.log({signature1})
                         /** CLIENT SIGNING ENDS */

            let tx;
            if (ownerWallet.coins >= 0.1009) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet});

                if (!existingTransaction) {
                    tx = new Transaction({
                        type,
                        action: "burn",
                        from: wallet,
                        nft,
                        amount,
                        nonce: 0,
                        signature
                    })
                } else {
                    tx = Transaction.update({
                        type, 
                        action: "burn",
                        from: wallet,
                        nft,
                        amount,
                        oldTransaction: existingTransaction,
                        signature
                    })
                }
                // console.log({tx})

                try {
                    tx.validate(stateDatabase, blockchain)

                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx)

                    res.status(201).json({
                        type: "success",
                        message: "transaction created",
                        transaction: tx
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: "error",
                        message: error.message
                    })
                }
            } else {
                return res.status(400).json({
                    type: "error",
                    message: "Coin balance not sufficient for this transaction"
                })
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({
                type: "error",
                message: error.message
            })
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            type: "error",
            message: "Something else went wrong"
        })
    }
})

// transfer 
app.post("/transfer", (req, res) => {
    try {
        const {wallet, recipient, nftCA, name, url, description, creator, position, totalSupply,  signature} = req.body;

        if (!nftCA) {
            if (!wallet || !name || !description || !signature || typeof wallet !== "string" || typeof name !== "string" || typeof description !== "string" || typeof signature !== "string") {
                return res.status(400).json({
                    type: "error",
                    message: "Asset name, url, description, creator, position, and totalSupply are required if no asset CA"
                })
            }
    
            if (url && typeof url !== "string"){
                return res.status(400).json({
                    type: "error",
                    message: "Invalid asset URL supplied"
                })
            }
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            const recipientWallet = stateDatabase.getAccount(recipient);
            if (!ownerWallet || !recipientWallet) {
                throw new Error('Wallet not found');
            }

            let nft;
            const amount = 1;
        
            // minted nfts
            for (const [key, n] of ownerWallet.nfts.entries()) {
                if (nftCA && nftCA === n.ca) {
                    nft = n
                } else if (
                    n.creator === creator &&
                    n.owner === wallet &&
                    n.name === name &&
                    n.url === url &&
                    n.description === description &&
                    n.position === position &&
                    n.totalSupply === totalSupply
                ) {
                    if (n.paused) return res.status(400).json({
                    type: "error",
                    message: "Asset is paused. Paused assets can not be traded"
                    })

                    nft = n
                }
            }
            // unminted nfts
            if (!nft) {
                for (const [key, n] of ownerWallet.unmintedNfts.entries()) {
                    if (nftCA && nftCA === n.ca) {
                        nft = n
                    } else if (
                        n.creator === creator &&
                        n.owner === wallet &&
                        n.name === name &&
                        n.url === url &&
                        n.description === description &&
                        n.position === position &&
                        n.totalSupply === totalSupply
                    ) {
                        if (n.paused) return res.status(400).json({
                        type: "error",
                        message: "Asset is paused. Paused assets can not be traded"
                        })
    
                        nft = n
                    }
                }
            }

            if (!nft) return res.status(404).json({
                type: "error",
                message: "Asset not found"
            })

                        /** TO BE MOVED TO CLIENT SIDE */
                        const EC = require("elliptic").ec;
                        const cryptoHash = require("./../../hash/crypto-hash");
            
                        const ec = new EC("secp256k1");
            
                        const privateKey = process.env.PK1;
                        // Sign transaction
                        const signTransaction = ({ data, privateKey }) => {
                            // console.log("DATA:", {data})
                            const key = ec.keyFromPrivate(privateKey);
                            const signature = key.sign(cryptoHash(data), 'base64');
                            return signature.toDER('hex');
                        };
            
                        const signature1 = signTransaction({ data: { wallet, recipient, nft, amount, type, action: "transfer" }, privateKey });
                        // console.log({signature1})
                        /** CLIENT SIGNING ENDS */

            let tx;
            if (ownerWallet.coins >= 0.1009) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet});

                if (!existingTransaction) {
                    tx = new Transaction({
                        type,
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        nft,
                        amount,
                        nonce: 0,
                        signature
                    })
                } else {
                    tx = Transaction.update({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        nft,
                        amount,
                        oldTransaction: existingTransaction,
                        signature
                    })
                }
                // console.log({tx})

                try {
                    tx.validate(stateDatabase, blockchain)

                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx)

                    res.status(201).json({
                        type: "success",
                        message: "transaction created",
                        transaction: tx
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: "error",
                        message: error.message
                    })
                }
            } else {
                return res.status(400).json({
                    type: "error",
                    message: "Coin balance not sufficient for this transaction"
                })
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({
                type: "error",
                message: error.message
            })
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            type: "error",
            message: "Something else went wrong"
        })
    }
})

// upgrade 

// set-marketplace

// get nftURI
app.post("/get-uri", (req, res) => {
    const {wallet, nftCA, name, url, description, creator, position, totalSupply} = req.body;

    if (typeof wallet !== "string" || !wallet) return res.status(400).json({
        type: "error",
        message: "Please use valid wallet address"
    })

    // console.log({wallet, nftCA, name, url, description, creator, position, totalSupply})
    // console.log(typeof wallet, typeof nftCA, typeof name, typeof url, typeof description, typeof creator, typeof position, typeof totalSupply)
    // console.log(nftCA.length)

    if (!nftCA || nftCA.length === 0) {
        if (
            typeof name !== "string" || !name  || 
            typeof url !== "string" || !url || 
            typeof description !== "string" || !description || 
            typeof creator !== "string" || !creator || 
            typeof position !== "number" || // !position //|| 
            typeof totalSupply !== "number" || !totalSupply // ||
            // typeof name !== "string" || !name || 
            // typeof name !== "string" || !name
        ) {
            console.log(name, url, description, creator, position, totalSupply)
            return res.status(400).json({
                type: "error",
                message: "No NFT Contract Address supplied. Valid NFT asset name, url, description, creator, position, and total supply are required"
            })
        }
    }

    try {
        let nft;

        for (const account of blockchain.accounts.values()) {
            if (nftCA ) {
                for (const [key, n] of account.nfts.entries()) {
                    if (n.ca === nftCA) nft = n
                } 
                // this should be redundant. 
                // if no nftCA, it would be in unminted
                // else if (
                //     n.creator === nftData.creator &&
                //     n.name === nftData.name &&
                //     n.url === nftData.url &&
                //     n.description === nftData.description &&
                //     n.totalSupply === nftData.totalSupply &&
                //     (n.position === nftData.position || nftData.position === undefined)
                // ) {
                //     nft = n;
                // }
            } else {
                // checking unminted nfts
                for (const [key, n] of account.unmintedNfts.entries()) {
                    if (
                        n.creator === creator &&
                        n.name === name &&
                        n.url === url &&
                        n.description === description &&
                        n.totalSupply === totalSupply &&
                        (n.position === position || position === undefined)
                    ) {
                        nft = n;
                    }
                }
            }
        }

        if (nft) {
            return res.status(200).json({
                type: "success",
                message: "Asset found",
                nft
            })
        } else {
            return res.status(404).json({
                type: "error",
                message: "Asset not found"
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            type: "error",
            message: "Error fetching details"
        })
    }

})

// buy
app.post("/buy", (req, res) => {
    try {
        const {wallet, nftCA, name, url, description, creator, owner, position, totalSupply,  signature, seller, price} = req.body;

        if (!nftCA || nftCA.length === 0 || typeof nftCA !== "string") {
            if (!wallet || !name || !creator || !owner || !description || !signature || typeof wallet !== "string" || typeof name !== "string" || typeof creator !== "string" || typeof owner !== "string" || typeof description !== "string" || typeof signature !== "string") {
                return res.status(400).json({
                    type: "error",
                    message: "Asset name, url, description, creator, position, and totalSupply are required if no asset CA"
                })
            }
    
            if (url && typeof url !== "string"){
                return res.status(400).json({
                    type: "error",
                    message: "Invalid asset URL supplied"
                })
            }

            if ((price && typeof price !== "number") || price <= 0){
                return res.status(400).json({
                    type: "error",
                    message: "Invalid asset price supplied"
                })
            }
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            if (!ownerWallet) {
                throw new Error('Wallet not found');
            }

            let nft;
            const amount = 1;

            for (const account of blockchain.accounts.values()) {
                if (nftCA ) {
                    for (const [key, n] of account.nfts.entries()) {
                        if (n.ca === nftCA) {
                            if (n.paused) return res.status(400).json({
                                type: "error",
                                message: "Asset is paused. Paused assets can not be traded"
                                })
                            nft = n
                        }
                    } 
                } else {
                    // checking unminted nfts
                    for (const [key, n] of account.unmintedNfts.entries()) {
                        if (
                            n.creator === creator &&
                            n.name === name &&
                            n.url === url &&
                            n.description === description &&
                            n.totalSupply === totalSupply &&
                            (n.position === position || position === undefined)
                        ) {
                            if (n.paused) return res.status(400).json({
                                type: "error",
                                message: "Asset is paused. Paused assets can not be traded"
                                })
                            nft = n;
                        }
                    }
                }
            }
        
            // // minted nfts
            // for (const [key, n] of ownerWallet.nfts.entries()) {
            //     if (nftCA && nftCA === n.ca) {
            //         if (n.paused) return res.status(400).json({
            //             type: "error",
            //             message: "Asset is paused. Paused assets can not be traded"
            //             })
            //         nft = n
            //     }
            //     //  else if (
            //     //     n.creator === creator &&
            //     //     n.owner === wallet &&
            //     //     n.name === name &&
            //     //     n.url === url &&
            //     //     n.description === description &&
            //     //     n.position === position &&
            //     //     n.totalSupply === totalSupply
            //     // ) {
            //     //     nft = n
            //     // }
            // }
            // // unminted nfts
            // if (!nft) {
            //     console.log("no nft yet")
            //     for (const [key, n] of ownerWallet.unmintedNfts.entries()) {
            //         console.log({n})
            //         if (
            //             n.creator === creator &&
            //             n.owner === owner &&
            //             n.name === name &&
            //             n.url === url &&
            //             n.description === description &&
            //             n.position === position &&
            //             n.totalSupply === totalSupply
            //         ) {
            //             if (n.paused) return res.status(400).json({
            //             type: "error",
            //             message: "Asset is paused. Paused assets can not be traded"
            //             })
    
            //             nft = n
            //         }
            //     }
            // }

            if (!nft) return res.status(404).json({
                type: "error",
                message: "Asset not found"
            })

            nft.seller = seller;
            nft.price = price;

            const recipient = stateDatabase.getAccount(seller.owner)
            if (!recipient) {
                throw new Error('Wallet not found');
            }

                        /** TO BE MOVED TO CLIENT SIDE */
                        const EC = require("elliptic").ec;
                        const cryptoHash = require("./../../hash/crypto-hash");
            
                        const ec = new EC("secp256k1");
            
                        const privateKey = process.env.PK2;
                        // Sign transaction
                        const signTransaction = ({ data, privateKey }) => {
                            // console.log("DATA:", {data})
                            const key = ec.keyFromPrivate(privateKey);
                            const signature = key.sign(cryptoHash(data), 'base64');
                            return signature.toDER('hex');
                        };
            
                        const signature1 = signTransaction({ data: { wallet, recipient: recipient.address, nft, amount, type, action: "buy" }, privateKey });
                        // console.log({signature1})
                        /** CLIENT SIGNING ENDS */

            let tx;
            if (ownerWallet.coins >= 0.1009) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet});

                if (!existingTransaction) {
                    tx = new Transaction({
                        type,
                        action: "buy",
                        from: wallet,
                        to: recipient.address,
                        nft,
                        amount,
                        nonce: 0,
                        signature
                    })
                } else {
                    tx = Transaction.update({
                        type, 
                        action: "buy",
                        from: wallet,
                        to: recipient.address,
                        nft,
                        amount,
                        oldTransaction: existingTransaction,
                        signature
                    })
                }
                // console.log({tx})

                try {
                    tx.validate(stateDatabase, blockchain)

                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx)

                    res.status(201).json({
                        type: "success",
                        message: "transaction created",
                        transaction: tx
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: "error",
                        message: error.message
                    })
                }
            } else {
                return res.status(400).json({
                    type: "error",
                    message: "Coin balance not sufficient for this transaction"
                })
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({
                type: "error",
                message: error.message
            })
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            type: "error",
            message: "Something else went wrong"
        })
    }
})

// sell
app.post("/list-for-sale", (req, res) => {
    try {
        const {wallet, nftCA, name, url, description, creator, position, totalSupply,  signature, price, seller} = req.body;

        if (!nftCA) {
            if (!wallet || !name || !description || !signature || typeof wallet !== "string" || typeof name !== "string" || typeof description !== "string" || typeof signature !== "string") {
                return res.status(400).json({
                    type: "error",
                    message: "Asset name, url, description, creator, position, and totalSupply are required if no asset CA"
                })
            }
    
            if (url && typeof url !== "string"){
                return res.status(400).json({
                    type: "error",
                    message: "Invalid asset URL supplied"
                })
            }
        }

        if (!price || typeof price !== "number" || price <= 0){
            return res.status(400).json({
                type: "error",
                message: "Invalid asset price supplied"
            })
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            if (!ownerWallet) {
                throw new Error('Wallet not found');
            }

            let nft;
            const amount = 1;
        
            // minted nfts
            for (const [key, n] of ownerWallet.nfts.entries()) {
                if (nftCA && nftCA === n.ca) {
                    nft = n
                } else if (
                    n.creator === creator &&
                    n.owner === wallet &&
                    n.name === name &&
                    n.url === url &&
                    n.description === description &&
                    n.position === position &&
                    n.totalSupply === totalSupply
                ) {
                    if (n.paused) return res.status(400).json({
                    type: "error",
                    message: "Asset is paused. Paused assets can not be traded"
                    })

                    nft = n
                }
            }
            // unminted nfts
            if (!nft) {
                for (const [key, n] of ownerWallet.unmintedNfts.entries()) {
                    if (nftCA && nftCA === n.ca) {
                        nft = n
                    } else if (
                        n.creator === creator &&
                        n.owner === wallet &&
                        n.name === name &&
                        n.url === url &&
                        n.description === description &&
                        n.position === position &&
                        n.totalSupply === totalSupply
                    ) {
                        if (n.paused) return res.status(400).json({
                        type: "error",
                        message: "Asset is paused. Paused assets can not be traded"
                        })
    
                        nft = n
                    }
                }
            }

            if (!nft) return res.status(404).json({
                type: "error",
                message: "Asset not found"
            })

            nft.seller = seller;
            nft.price = price;

                        /** TO BE MOVED TO CLIENT SIDE */
                        const EC = require("elliptic").ec;
                        const cryptoHash = require("./../../hash/crypto-hash");
            
                        const ec = new EC("secp256k1");
            
                        const privateKey = process.env.PK1;
                        // Sign transaction
                        const signTransaction = ({ data, privateKey }) => {
                            // console.log("DATA:", {data})
                            const key = ec.keyFromPrivate(privateKey);
                            const signature = key.sign(cryptoHash(data), 'base64');
                            return signature.toDER('hex');
                        };
            
                        const signature1 = signTransaction({ data: { wallet, nft, amount, price: nft.price, seller: nft.seller, type, action: "list-for-sale" }, privateKey });
                        // console.log({signature1})
                        /** CLIENT SIGNING ENDS */

            let tx;
            if (ownerWallet.coins >= 0.1009) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet});

                if (!existingTransaction) {
                    tx = new Transaction({
                        type,
                        action: "list-for-sale",
                        from: wallet,
                        nft,
                        amount,
                        nonce: 0,
                        signature
                    })
                } else {
                    tx = Transaction.update({
                        type, 
                        action: "list-for-sale",
                        from: wallet,
                        nft,
                        amount,
                        oldTransaction: existingTransaction,
                        signature
                    })
                }
                // console.log({tx})

                try {
                    tx.validate(stateDatabase, blockchain)

                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx)

                    res.status(201).json({
                        type: "success",
                        message: "transaction created",
                        transaction: tx
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: "error",
                        message: error.message
                    })
                }
            } else {
                return res.status(400).json({
                    type: "error",
                    message: "Coin balance not sufficient for this transaction"
                })
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({
                type: "error",
                message: error.message
            })
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            type: "error",
            message: "Something else went wrong"
        })
    }
})

// pause

// unpause

// freeze

// unfreeze

// lock

// unlock

module.exports = app