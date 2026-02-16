require("dotenv").config();
const express = require("express");
const Transaction = require("../../transaction");
const Token = require("../../token");
const getAssetMarketValue = require("../../utils/getAssetsValue");
const getInstances = require("../../common");
const {blockchain, pubsub, transactionPool, stateDatabase} = getInstances();
const { BLOCKCHAIN_METADATA } = require("../../config");

const app = express.Router();

const type = "token";

/** TOKEN ROUTES **/
// create token
app.post("/create", (req, res) => {
    try {
        const {wallet, name, symbol, logo, totalSupply, paused, eol, signature} = req.body

        // Basic user validations
        if (!wallet || !signature) {
            return res.status(400).json({
                type: 'error',
                message: 'Wallet, Recipient, Amount, and Signature are required'
            });
        }
        // Basic token validations
        if (!name || !symbol || !logo || !totalSupply) {
            return res.status(400).json({
                type: 'error',
                message: 'Token metadata details (name, symbol, logo, and total supply) are required'
            });
        }

        if (isNaN(totalSupply) || totalSupply <= 0) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid total supply amount specified'
            });
        }

        if (typeof signature !== "string") {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid Signature for the transaction'
            });
        }

       try {
            const ownerWallet = stateDatabase.getAccount(wallet)
            if (!ownerWallet) {
                throw new Error('Wallet not found');
            }

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

            const signature1 = signTransaction({ data: { wallet, token: {name, symbol, logo}, amount: totalSupply, type, action: "create" }, privateKey });
            // console.log({signature1})
            /** CLIENT SIGNING ENDS */
            
            const token = new Token({
                name: name,
                symbol: symbol,
                logo: logo,
                totalSupply: totalSupply,
                owner: ownerWallet.address,
                paused,
                eol,
            })

            // console.log({token})
            // console.log({ownerWallet})

            let tx;
            if (ownerWallet.coins >= 0.0209) {
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})

                if (!existingTransaction) {
                    tx = new Transaction({type, action: "create", from: wallet, token, nonce: 0, amount: token.totalSupply, signature })
                } else {
                    tx = Transaction.update({type, action:"create", from: wallet, token, amount: token.totalSupply, oldTransaction: existingTransaction, signature})
                }

                try {
                    tx.validate(stateDatabase, blockchain)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.log(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message,
                    });
                }
            } else {
                res.status(400).json({
                    type: "error",
                    message: "You don't have enough balance to perform this operation."
                });
            }
            
            // const createTokenTransaction = new Transaction({type, action: "create", ownerWallet, token, signature})
            // console.log({createTokenTransaction})
            
            // transactionPool.setTransaction(tx)
            // pubsub.broadcastTransaction(tx)

            // // add token to blockchain tokens
            // blockchain.tokens.set(token.ca, token);

            // console.log("1:", {token})
            // console.log("blockchain tokens:", blockchain.tokens)
            // blockchain.tokens.set(token.ca, token);



        } catch (error) {
            console.error(error);
            return res.status(400).json({
                type: 'error',
                message: "Error ocurred! Try again later",
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
})

// transfer
app.post("/transfer", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
            try {
                if (existingTransaction) {  
                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// mint 
app.post("/mint", async (req, res) => {
    const {wallet, tokenCA, amount, signature} = req.body

    // Basic validations
    if (!wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Wallet, and Signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (typeof wallet !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid wallet address'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }

    if (token.frozen) return res.status(400).json({
        type: 'error',
        message: "You can not mint new tokens. Mint authority is frozen"
    })
    if (token.hasExpired()) return res.status(400).json({
        type: "error",
        message: error.message
    })

    try {
        token._onlyAdmin(wallet)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, type, action: "mint" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    tx = Transaction.update({type, action: "mint", from: wallet, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "mint",
                        from: wallet,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// burn 
app.post("/burn", async (req, res) => {
    const {wallet, tokenCA, amount, signature} = req.body

    // Basic validations
    if (!wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Wallet, and Signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (typeof wallet !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid wallet address'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }

    if (token.frozen) return res.status(400).json({
        type: 'error',
        message: "You can not burn this token. Asset is frozen"
    })
    if (token.hasExpired()) return res.status(400).json({
        type: "error",
        message: error.message
    })

    try {
        token._onlyAdmin(wallet)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, type, action: "burn" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {
            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})

            try {
                if (existingTransaction) {  
                    tx = Transaction.update({type, action: "burn", from: wallet, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    tx = new Transaction({
                        type, 
                        action: "burn",
                        from: wallet,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// pause 
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// unpause
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// freeze
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// unfreeze 
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// lock
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// unlock 
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// swap
app.post("/swap", async (req, res) => {
    const { wallet, recipient, tokenCA1, amount1, tokenCA2, signature } = req.body;

    let amount2 = 0
    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if ((!tokenCA1 || typeof tokenCA1 !== "string") || (!tokenCA2 || typeof tokenCA2 !== "string")) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount1 || (isNaN(amount1) || amount1 <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    // if (!recipient || !wallet) {
    //     return res.status(400).json({
    //         type: 'error',
    //         message: 'Recipient and wallet are required'
    //     });
    // }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token1 = blockchain.tokens.get(tokenCA1)
    const token2 = blockchain.tokens.get(tokenCA2)
    // console.log("TOKEN:", {token})
    if (!token1 || !token2) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. One of this assets does not exist'
        });
    }
    if (token1.paused ) return res.status(400).json({
        type: 'error',
        message: `${token1} Token is paused. This asset can not be traded`
    });
    if (token2.paused) return res.status(400).json({
        type: 'error',
        message: `${token2} Token is paused. This asset can not be traded`
    });

    try {
        token1.transferable(wallet, recipient)
        token2.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const token1MarketValue = await getAssetMarketValue(token1.symbol) || 0.1
        const token2MarketValue = await getAssetMarketValue(token2.symbol) || 0.01
        
        if (token1MarketValue === null || token2MarketValue === null) {
            console.error("Unable to fetch market values. Aborting swap.");
            return;
        }
        
        amount2 = (amount1 * token1MarketValue) / token2MarketValue;
        
        if (!amount2 || (isNaN(amount2) || amount2 <= 0)) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid token amount specified'
            });
        }
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: {token1: token1.ca, token2: token2.ca}, amount: {amount1, amount2}, recipient, type, action: "swap" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */

        let tx;

        if (tokenCA1 && tokenCA2 && amount1 && amount2) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    tx = Transaction.update({type, action: "swap", from: wallet, to: recipient, token: {token1, token2}, amount: {amount1, amount2}, oldTransaction: existingTransaction, signature})
                } else {
                    tx = new Transaction({
                        type, 
                        action: "swap",
                        from: wallet,
                        to: recipient,
                        token: {token1, token2}, 
                        amount: {amount1, amount2},
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// set-max-supply
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// upgrade-contract
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// buy 
app.post("/buy", async (req, res) => {
    const { wallet, recipient, tokenCA, amount1, signature } = req.body;

    let amount2 = 0;
    const symbol = BLOCKCHAIN_METADATA.symbol;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if ((!tokenCA || typeof tokenCA !== "string") ) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount1 || (isNaN(amount1) || amount1 <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid coin amount specified'
        });
    }

    // if (!recipient || !wallet) {
    //     return res.status(400).json({
    //         type: 'error',
    //         message: 'Recipient and wallet are required'
    //     });
    // }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)

    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This assets does not exist'
        });
    }
    if (token.paused ) return res.status(400).json({
        type: 'error',
        message: `${token} Token is paused. This asset can not be traded`
    });

    try {
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const coinMarketValue = await getAssetMarketValue(symbol) || 100
        const tokenMarketValue = await getAssetMarketValue(token.symbol) || 0.01
        
        if (tokenMarketValue === null || coinMarketValue === null) {
            console.error("Unable to fetch market values. Aborting swap.");
            return;
        }
        
        amount2 = (amount1 * coinMarketValue) / tokenMarketValue;
        
        if (!amount2 || (isNaN(amount2) || amount2 <= 0)) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid token amount specified'
            });
        }
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, recipient, tokenCA, amount: {amount1, amount2}, recipient, type, action: "buy" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */

        let tx;

        if (tokenCA && amount1 && amount2) {

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})

            try {
                if (existingTransaction) {  
                    tx = Transaction.update({type, action: "buy", from: wallet, to: recipient, token, amount: {amount1, amount2}, oldTransaction: existingTransaction, signature})
                } else {
                    tx = new Transaction({
                        type, 
                        action: "buy",
                        from: wallet,
                        to: recipient,
                        token, 
                        amount: {amount1, amount2},
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// sell
app.post("/sell", async (req, res) => {
    const { wallet, recipient, tokenCA, amount1, signature } = req.body;

    let amount2 = 0;
    const symbol = BLOCKCHAIN_METADATA.symbol;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if ((!tokenCA || typeof tokenCA !== "string") ) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount1 || (isNaN(amount1) || amount1 <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    // if (!recipient || !wallet) {
    //     return res.status(400).json({
    //         type: 'error',
    //         message: 'Recipient and wallet are required'
    //     });
    // }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)

    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This assets does not exist'
        });
    }
    if (token.paused ) return res.status(400).json({
        type: 'error',
        message: `${token} Token is paused. This asset can not be traded`
    });

    try {
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const coinMarketValue = await getAssetMarketValue(symbol) || 100
        const tokenMarketValue = await getAssetMarketValue(token.symbol) || 0.01
        
        if (tokenMarketValue === null || coinMarketValue === null) {
            console.error("Unable to fetch market values. Aborting swap.");
            return;
        }
        
        amount2 = (amount1 * tokenMarketValue) / coinMarketValue;
        
        if (!amount2 || (isNaN(amount2) || amount2 <= 0)) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid coin amount specified'
            });
        }
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, recipient, tokenCA, amount: {amount1, amount2}, recipient, type, action: "sell" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */

        let tx;

        if (tokenCA && amount1 && amount2) {

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})

            try {
                if (existingTransaction) {  
                    tx = Transaction.update({type, action: "sell", from: wallet, to: recipient, token, amount: {amount1, amount2}, oldTransaction: existingTransaction, signature})
                } else {
                    tx = new Transaction({
                        type, 
                        action: "sell",
                        from: wallet,
                        to: recipient,
                        token, 
                        amount: {amount1, amount2},
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});

// stake
app.post("/transact", async (req, res) => {
    const { wallet, recipient, tokenCA, amount, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient, wallet, and signature are required'
        });
    }

    if (!tokenCA || typeof tokenCA !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token specified'
        });
    }

    if (!amount || (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token amount specified'
        });
    }

    if (!recipient || !wallet) {
        return res.status(400).json({
            type: 'error',
            message: 'Recipient and wallet are required'
        });
    }

    // console.log("BC TOKENS:", blockchain.tokens)
    const token = blockchain.tokens.get(tokenCA)
    // console.log("TOKEN:", {token})
    if (!token) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid token. This asset does not exist'
        });
    }
    if (token.paused) return res.status(400).json({
        type: 'error',
        message: 'Token is paused. This asset can not be traded'
    });

    try {
        // console.log("transfer route token:", {token})
        // token.hasExpired()
        // token._onlyAdmin(wallet)
        token.transferable(wallet, recipient)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            type: 'error',
            message: error.message
        });
    }

    try {
        const ownerWallet = stateDatabase.getAccount(wallet)
        if (!ownerWallet) {
            throw new Error('wallet wallet not found');
        }
        const recipientWallet = stateDatabase.getAccount(recipient)
        if (!recipientWallet) {
            throw new Error('Recipient wallet not found');
        }
            
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
            // console.log("SIGNATURE:", signature)
            // console.log("SIGNATURE.toDER('hex'):", signature.toDER('hex'))
            return signature.toDER('hex');
        };
        let signature1;
        signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" }, privateKey });

        // console.log({signature1})

        /** CLIENT SIGNING ENDS */


        let tx;

        if (tokenCA && amount) {

            // const walletToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            // if (!walletToken || walletToken.balance < amount) {
            //     throw new Error(`You do not have enough ${walletToken.name} tokens.`);
            // }

            // transaction check
            const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
//             // console.log("TOKEN in routes:", token.balances)
            try {
                if (existingTransaction) {  
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount: transaction.input.amount, recipient }, privateKey });

                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, token, amount, oldTransaction: existingTransaction, signature})
                } else {
                    // signature1 = signTransaction({ data: { wallet, token: token.ca, amount, recipient }, privateKey });

                    tx = new Transaction({
                        type, 
                        action: "transfer",
                        from: wallet,
                        to: recipient,
                        token,
                        amount,
                        nonce: 0,
                        signature
                    });
                }

                try {
                    tx.validate(stateDatabase)
                    transactionPool.setTransaction(tx);
                    pubsub.broadcastTransaction(tx);

                    res.status(201).json({
                        type: "success",
                        message: "Blockchain transaction successful",
                        transaction: tx
                    });
                } catch (error) {
                    console.error(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message
                    }) 
                }
            } catch (error) {
                console.error(error)
                return res.status(400).json({
                    type: 'error',
                    message: error.message
                })
            }
        } 
 

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: error.message,
        });
    }
});






module.exports = app