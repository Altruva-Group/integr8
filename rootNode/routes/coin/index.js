require("dotenv").config();
const express = require("express");
const Transaction = require("../../transaction");
const Wallet = require("./../../wallet");
const getAssetMarketValue = require("../../utils/getAssetsValue");
const { BLOCKCHAIN_METADATA, STARTING_BALANCE } = require("../../config");
const deepCopy = require("../../utils/deepCopy");
const getInstances = require("../../common");


const app = express.Router();

const type = "coin";
const {blockchain, pubsub, transactionPool, stateDatabase} = getInstances();
// console.log("COIN ROUTES:", {
//     "blockchain": blockchain,
//     "transactionPool": transactionPool,
//     "stateDatabase": stateDatabase,
//     // "transactionMiner": transactionMiner,
//     "pubsub": pubsub,
// })

// // //
// Create a new wallet
app.get("/create/", (req, res) => {
    try {
        const wallet = new Wallet();

        // console.log("WALLET:", wallet);
        
        stateDatabase.createAccount(wallet.publicKey).updateCoins(STARTING_BALANCE) // to remove starting balance later
        // console.log("stateDatabase:", stateDatabase);

        res.status(201).json({
            type: "success",
            message: "Wallet created successfully",
            wallet: {
                id: wallet.id,
                mnemonic: wallet.mnemonic,
                publicKey: wallet.publicKey,
                privateKey: wallet.privateKey
            }
        });
    } catch (error) {
        res.status(500).json({
            type: "error",
            message: "Error creating wallet",
            error: error.message
        });
    }
});

// // Get wallet by private key
// app.get("/private-key/:privateKey", (req, res) => {
//     const { privateKey } = req.params;
//     const wallet = Wallet.getWalletByPrivateKey(privateKey);


//     if (wallet) {
//         res.status(200).json({
//             type: "success",
//             message: "Wallet found",
//             wallet
//         });
//     } else {
//         res.status(404).json({
//             type: "error",
//             message: "Wallet not found"
//         });
//     }
// });

// // Get wallet by mnemonic
// app.get("/mnemonic/:mnemonic", (req, res) => {
//     const { mnemonic } = req.params;
//     const wallet = Wallet.getWalletByMnemonic(mnemonic);

//     if (wallet) {
//         res.status(200).json({
//             type: "success",
//             message: "Wallet found",
//             wallet
//         });
//     } else {
//         res.status(404).json({
//             type: "error",
//             message: "Wallet not found"
//         });
//     }
// });

// Fetch wallet info by public key
app.get("/:publicKey", (req, res) => {
    const { publicKey } = req.params;

    if (typeof publicKey !== "string" || !publicKey) res.status(400).json({
        type: "error",
        message: "Please use valid wallet address"
    })

    // Fetch Wallet balances
    const wallet = stateDatabase.getAccount(publicKey);
    if (!wallet) {
        return res.status(404).json({
            type: "error",
            message: "Wallet not found"
        });
    }

    // Respond with minted and unminted NFTs
    res.status(200).json({
        type: "success",
        message: "Wallet assets fetched",
        publicKey,
        assets: {
            coins: wallet.coins,
            tokens: Array.from(wallet.tokens.entries()),
            mintedNfts: Array.from(wallet.nfts.entries()),
            unmintedNfts: Array.from(wallet.unmintedNfts), 
            stakedCoins: wallet.stakedCoins,
            stakedTokens: Array.from(wallet.stakedTokens.entries()),
            stakingRewards: wallet.stakingRewards
        }
    });
});


app.post("/transfer", async (req, res) => {
    const { amount, recipient, wallet, signature } = req.body;
    // console.log({ amount, recipient, wallet, signature })

    // Basic validations
    if (!recipient || !wallet || !signature || !amount) {
        return res.status(400).json({
            type: 'error',
            message: 'Wallet, Recipient, Amount, and Signature are required'
        });
    }

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid amount specified'
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
        const recipientWallet = stateDatabase.getAccount(recipient)
        // console.log({ownerWallet, recipientWallet})

        if (!ownerWallet) return res.status(404).json({
            type: "error",
            message: "Owner account not found. Please confirm the sender wallet address"
        })
        if (!recipientWallet) return res.status(404).json({
            type: "error",
            message: "Recipient account not found. Please confirm the recipient wallet address"
        })

        // console.log({ownerWallet, recipientWallet})

        // try {
            let tx;
            if ((ownerWallet.coins - amount) > 0.0009){    
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
    
                if (!existingTransaction) {
                    tx = new Transaction({type, action: "transfer", nonce: 0, from: wallet, to: recipient, amount, signature})
                } else {
                    tx = Transaction.update({type, action: "transfer", from: wallet, to: recipient, amount, oldTransaction: existingTransaction, signature})
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
                    console.log(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message,
                    });
                }
            } else {
                    res.status(400).json({
                        type: "error",
                        message: "You can't send this amount. Please send lower amount."
                    });
            }
    
        // } catch (error) {
        //     console.error(error);
        //     return res.status(400).json({
        //         type: 'error',
        //         message: "Something went wrong.",
        //     });
        // }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: "Error ocurred! Try again later",
        });
    }
});

app.post("/stake", async (req, res) => {
    const { amount, wallet, signature } = req.body;

    // Basic validations
    if (!wallet || !signature || !amount) {
        return res.status(400).json({
            type: 'error',
            message: 'Wallet, staking Amount, and Signature are required'
        });
    }

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid amount specified'
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
        // console.log({ownerWallet})

        if (!ownerWallet) return res.status(404).json({
            type: "error",
            message: "Account not found. Please confirm the sender or receiver wallet address"
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
        let signature1;
        
        if (amount) {
            signature1 = signTransaction({ data: { wallet, amount, type, action: "stake" }, privateKey });
        }

        /** CLIENT SIGNING ENDS */


        // console.log({ownerWallet, recipientWallet})

        // try {
            let tx;
            if ((ownerWallet.coins - amount) > 0.0009){    
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
    
                if (!existingTransaction) {
                    tx = new Transaction({type, action: "stake", nonce: 0, from: wallet, amount, signature})
                } else {
                    tx = Transaction.update({type, action: "stake", from: wallet, amount, oldTransaction: existingTransaction, signature})
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
                    console.log(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message,
                    });
                }
            } else {
                    res.status(400).json({
                        type: "success",
                        message: "You can't send this amount. Please send lower amount."
                    });
            }
    
        // } catch (error) {
        //     console.error(error);
        //     return res.status(400).json({
        //         type: 'error',
        //         message: "Something went wrong.",
        //     });
        // }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: "Error ocurred! Try again later",
        });
    }
});

app.post("/unstake", async (req, res) => {
    const { amount, wallet, signature } = req.body;

    // Basic validations
    if (!wallet || !signature || !amount) {
        return res.status(400).json({
            type: 'error',
            message: 'Wallet, staking Amount, and Signature are required'
        });
    }

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid amount specified'
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
        // console.log({ownerWallet})

        if (!ownerWallet) return res.status(404).json({
            type: "error",
            message: "Account not found. Please confirm the sender or receiver wallet address"
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
        let signature1;
        
        if (amount) {
            signature1 = signTransaction({ data: { wallet, amount, type, action: "unstake" }, privateKey });
        }

        /** CLIENT SIGNING ENDS */


        // console.log({ownerWallet, recipientWallet})

        // try {
            let tx;
            if ((ownerWallet.coins - amount) > 0.0009){    
                const existingTransaction = transactionPool.existingTransaction({inputAddress: wallet})
    
                if (!existingTransaction) {
                    tx = new Transaction({type, action: "unstake", nonce: 0, from: wallet, amount, signature})
                } else {
                    tx = Transaction.update({type, action: "unstake", from: wallet, amount, oldTransaction: existingTransaction, signature})
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
                    console.log(error)
                    return res.status(400).json({
                        type: 'error',
                        message: error.message,
                    });
                }
            } else {
                    res.status(400).json({
                        type: "success",
                        message: "You can't send this amount. Please send lower amount."
                    });
            }
    
        // } catch (error) {
        //     console.error(error);
        //     return res.status(400).json({
        //         type: 'error',
        //         message: "Something went wrong.",
        //     });
        // }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: 'error',
            message: "Error ocurred! Try again later",
        });
    }
});

// buy token
app.post("/buy", async (req, res) => {
    const { wallet, recipient, amount1, tokenCA, signature } = req.body;

    // Basic validations
    if (!recipient || !wallet || !signature || !amount1 || !tokenCA) {
        return res.status(400).json({
            type: 'error',
            message: 'Wallet, Recipient, Token, Amount, and Signature are required'
        });
    }

    if (isNaN(amount1) || amount1 <= 0) {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid amount specified'
        });
    }

    if (typeof signature !== "string") {
        return res.status(400).json({
            type: 'error',
            message: 'Invalid Signature for the transaction'
        });
    }

    try {
        // Get the wallets of sender and recipient
        const ownerWallet = stateDatabase.getAccount(wallet);
        const recipientWallet = stateDatabase.getAccount(recipient);

        if (!ownerWallet || !recipientWallet) {
            return res.status(404).json({
                type: "error",
                message: "Account not found. Please confirm the sender or receiver wallet address."
            });
        }

        // Validate token contract
        const token = blockchain.tokens.get(tokenCA);
        if (!token) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid token. This asset does not exist.'
            });
        }

        if (token.paused) {
            return res.status(400).json({
                type: 'error',
                message: 'Token is paused. This asset cannot be traded.'
            });
        }

        // Calculate the market values and the amount to be swapped
        const coinMarketValue = await getAssetMarketValue(BLOCKCHAIN_METADATA.symbol) || 100;
        const tokenMarketValue = await getAssetMarketValue(token.symbol) || 0.1;
        const amount2 = (amount1 * coinMarketValue) / tokenMarketValue;

        if (!amount2 || isNaN(amount2) || amount2 <= 0) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid token amount calculated for the swap.'
            });
        }

        // Ensure sufficient token and coin balance
        if (ownerWallet.coins < amount1) {
            return res.status(400).json({
                type: 'error',
                message: `Insufficient ${BLOCKCHAIN_METADATA.symbol} balance for the swap.`
            });
        }

        const recipientToken = recipientWallet.tokens.find(t => t.ca === tokenCA);
        if (!recipientToken || recipientToken.balance < amount2) {
            return res.status(400).json({
                type: 'error',
                message: `Insufficient ${recipientToken ? recipientToken.name : "token"} balance for the swap.`
            });
        }

        /** CLIENT SIGNING: This should be done client-side */
        const EC = require("elliptic").ec;
        const cryptoHash = require("./../../hash/crypto-hash");
        const ec = new EC("secp256k1");

        const privateKey = process.env.PK1;  // Replace with actual owner's private key logic
        const signTransaction = ({ data, privateKey }) => {
            const key = ec.keyFromPrivate(privateKey);
            const signature = key.sign(cryptoHash(data), 'base64');
            return signature.toDER('hex');
        };

        // Sign the transaction data
        const signature1 = signTransaction({
            data: { wallet, recipient, tokenCA, amount: { amount1, amount2 } },
            privateKey
        });

        // Create the buy token transaction
        const buyTokenTransaction = new CoinTransaction({
            action: "buy-token",
            ownerWallet,
            recipientWallet,
            amount: { amount1, amount2 },
            token,
            signature
        });

        // Add transaction to the pool and broadcast
        transactionPool.setTransaction(buyTokenTransaction);
        pubsub.broadcastTransaction(buyTokenTransaction);

        return res.status(201).json({
            type: 'success',
            message: "Token purchase successful.",
            transaction: buyTokenTransaction
        });

    } catch (error) {
        console.error("Token purchase error:", error);
        return res.status(500).json({
            type: 'error',
            message: "An error occurred during the token purchase. Please try again later."
        });
    }
});

// sell token
app.post("/sell", async (req, res) => {
    try {
        const { wallet, recipient, amount2, tokenCA, signature } = req.body;

        let amount1;
        const symbol = BLOCKCHAIN_METADATA.symbol;

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

        if (!amount2 || (isNaN(amount2) || amount2 <= 0)) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid token amount specified'
            });
        }

        // Validate input tokens
        const token = blockchain.tokens.get(tokenCA);

        if (!token) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid token. This asset does not exist'
            });
        }

        if (token.paused) return res.status(400).json({
            type: 'error',
            message: 'Token is paused. This asset cannot be traded'
        });

        try {
            token.transferable(wallet, recipient);
        } catch (error) {
            return res.status(400).json({
                type: 'error',
                message: error.message
            });
        }

        const coinMarketValue = await getAssetMarketValue(symbol) || 100;
        const tokenMarketValue = await getAssetMarketValue(token.symbol) || 0.1;

        if (coinMarketValue === null || tokenMarketValue === null) {
            console.error("Unable to fetch market values. Aborting swap.");
            return;
        }

        amount1 = (amount2 * tokenMarketValue) / coinMarketValue;
        console.log({ amount1 });

        if (!amount1 || (isNaN(amount1) || amount1 <= 0)) {
            return res.status(400).json({
                type: 'error',
                message: 'Invalid coin amount specified'
            });
        }

        try {
            const ownerWallet = stateDatabase.getAccount(wallet);
            const recipientWallet = Wallet.getWalletByPublicKey({ publicKey: recipient, blockchain });

            if (!ownerWallet || !recipientWallet) {
                return res.status(400).json({
                    type: 'error',
                    message: 'Invalid wallet address.'
                });
            }

            /** CLIENT SIGNING: This should be done client-side */
            const EC = require("elliptic").ec;
            const cryptoHash = require("./../../hash/crypto-hash");

            const ec = new EC("secp256k1");
            const privateKey = ownerWallet.privateKey;

            const signTransaction = ({ data, privateKey }) => {
                const key = ec.keyFromPrivate(privateKey);
                const signature = key.sign(cryptoHash(data), 'base64');
                return signature.toDER('hex');
            };

            let signature1 = signTransaction({
                data: { wallet, recipient, tokenCA, amount: { amount1, amount2 } },
                privateKey
            });

            /** CLIENT SIGNING ENDS */

            let walletAssets = Wallet.calculateBalance({
                chain: blockchain.chain,
                address: ownerWallet.publicKey,
                transactionPool,
                blockchain
            });
            let recipientAssets = Wallet.calculateBalance({
                chain: blockchain.chain,
                address: recipientWallet.publicKey,
                transactionPool,
                blockchain
            });

            ownerWallet.balance = walletAssets.balance;
            ownerWallet.tokens = walletAssets.tokens || [];
            ownerWallet.nfts = walletAssets.nfts || [];

            recipientWallet.balance = recipientAssets.balance;
            recipientWallet.tokens = recipientAssets.tokens || [];
            recipientWallet.nfts = recipientAssets.nfts || [];

            // Ensure sufficient tokens for swap
            const ownerToken = ownerWallet.tokens.find(t => t.ca === tokenCA);
            if (!ownerToken || ownerToken.balance < amount2) {
                return res.status(400).json({
                    type: 'error',
                    message: `Insufficient ${ownerToken ? ownerToken.name : "token"} balance for the swap.`
                });
            }

            const recipientCoin = recipientWallet.balance;
            if (!recipientCoin || recipientCoin < amount1) {
                return res.status(400).json({
                    type: 'error',
                    message: `Insufficient ${symbol} balance for the swap.`
                });
            }

            const sellTokenTransaction = new CoinTransaction({
                action: "sell-token",
                ownerWallet,
                recipientWallet,
                amount: {
                    amount1,
                    amount2
                },
                token,
                signature
            });

            transactionPool.setTransaction(sellTokenTransaction);
            pubsub.broadcastTransaction(sellTokenTransaction);

            return res.status(200).json({
                type: 'success',
                message: "Tokens sold successfully.",
                sellTokenTransaction
            });

        } catch (error) {
            console.log("sell token error", error);
            return res.status(500).json({
                type: 'error',
                message: "Error occurred during the token sell. Please try again."
            });
        }
    } catch (error) {
        console.log("sell token error", error);
        return res.status(500).json({
            type: 'error',
            message: "An error occurred. Please try again."
        });
    }
});

app.get("/known-addresses", (req, res) => {
    const addressMap = {};
    try {
        for (let block of blockchain.chain) {
            for (let transaction of block.transactions) {
                const recipients = Object.keys(transaction.outputMap);

                recipients.forEach(recipient => addressMap[recipient] = recipient);
            }
        }

        res.status(200).json({
            type: "success",
            message: "Accounts interacted with.",
            knownAddresses: Object.keys(addressMap)
        });
    } catch (error) {
        res.status(400).json({
            type: "error",
            message: "No record found",
        });
    }
});

module.exports = app