const Wallet = require("./wallet")

const wallet = new Wallet()

console.log({wallet})



const Account = require("./accounts")
const NFT = require("./nft")

const nft1 = new NFT({
    creator: "creator", owner: "creator", name: "name", url: "url", description: "description", standard: true, amount: 1
})
const nft2 = new NFT({
    creator: "creator", owner: "creator", name: "name", url: "url", description: "description", standard: true, amount: 1
})

// nft.mint("creator", "owner")

// console.log({nft})

const acct = new Account("abc");

acct.nfts.add(nft1)

// console.log({acct})
// console.log(acct.nfts)
// console.log(nft1)
// console.log(nft2)

const foundNft = acct.nfts.has(nft1)
// console.log({foundNft})

// const newNft = acct.nfts[nft1]
// const newNft = acct.nfts[nft2]
let newNft;
for (const n of acct.nfts.entries()) {
    // if ()
}

console.log({newNft})
















// const Account = require("./accounts");

const account1 = new Account("address1");

console.log({account1})

account1.updateCoins(10);
account1.updateTokens("abc", 100, true)
account1.updateTokens("abc", 10)
account1.updateTokens("abc", 10)
account1.updateTokens("abc", 10)
account1.updateTokens("abc", 10)
account1.updateTokens("abc", 100, true)

console.log({account1})





// // const Blockchain = require("./blockchain");
// // const PubSub = require("./utils/pubsub");
// // // const Transaction = require("./transaction")
// // const TransactionPool = require("./mempool");
// // const Wallet = require("./wallet");
// // const TransactionMiner = require("./miner/transaction-miner");
// // const TokenTransactionMiner = require("./miner/token-transaction-miner");
// // const NftTransactionMiner = require("./miner/nft-transaction-miner");

// // const Token = require("./tokens");
// // const Nft = require("./nfts");
// // // const TokenContract = require("./tokens/contract");
// // const TokenTransaction = require("./transaction/token-transaction");

// // const isDevelopment = true
// // const REDIS_URL = isDevelopment ? 'localhost' : "redis://default:d2JDknzPFVd3MC41iGnitB5hIkW9lHSv@redis-15494.c293.eu-central-1-1.ec2.redns.redis-cloud.com:15494";


// // const blockchain = new Blockchain();
// // const transactionPool = new TransactionPool();
// // const pubsub = new PubSub({ blockchain, transactionPool, redisUrl: REDIS_URL });
// // const transactionMiner = new TransactionMiner({ blockchain, transactionPool, pubsub });
// // const tokenTransactionMiner = new TokenTransactionMiner({ blockchain, transactionPool, pubsub });
// // const nftTransactionMiner = new NftTransactionMiner({ blockchain, transactionPool, pubsub });



// // const sender = "04c631e9b46bfa3d6f19c7c94f76371013860cd66d313cdcf9fcda6e4505c3c3afa543680af67218119063e121e91e0f9d090631608a2adbb24c238583be498314"
// // const recipient = "04cc87af256480f37a8e6b01cedefd0b34c5bef47706d9570203db1c0e1ebe1d2f24759ada9d66a56b7f9df99f1fe07496f6aac884cbec03bfc01e198ca9f363f3"

// // const ownerWallet = Wallet.getWalletByPublicKey({ publicKey: sender, blockchain });
// // if (!ownerWallet) {
// //     throw new Error('Owner wallet not found');
// // }

// // const assets = Wallet.calculateBalance({
// //    chain: blockchain.chain,
// //    address: sender,
// //    transactionPool
// // });

// // // sender assets
// // ownerWallet.balance = assets.balance;
// // ownerWallet.tokens = assets.tokens || [];
// // ownerWallet.nfts = assets.nfts || [];

// // const token = new Token(
// //    {
// //     name: "INTGRX",
// //     symbol: "STM",
// //     logo: "STM",
// //     totalSupply: 1000000,
// //     owner: ownerWallet,
// //    }
// // )

// // const createTokenTransaction = new TokenTransaction({token, ownerWallet})
// // // console.log({createTokenTransaction})

// // transactionPool.setTransaction(createTokenTransaction)
// // pubsub.broadcastTransaction(createTokenTransaction)

// // // console.log({transactionPool})

// // // mine transactions

// // const minerWallet = Wallet.getWalletByPublicKey({ publicKey: recipient, blockchain });
// // if (!minerWallet) {
// //     throw new Error('Sender wallet not found');
// // }
// // // Calculate the balance
// // const walletAssets = Wallet.calculateBalance({
// //     chain: blockchain.chain,
// //     address: recipient,
// //     transactionPool
// // });

// // minerWallet.balance = walletAssets.balance
// // minerWallet.tokens = walletAssets.tokens
// // minerWallet.nfts = walletAssets.nfts
// // tokenTransactionMiner.mineTransactions(minerWallet);

// // console.log(blockchain.chain.data)


// // // transactionPool.setToken(token)

// // // console.log("TOKEN:", {token})
// // // console.log("TOKEN:", token.ca)
// // // console.log("TRANSACTION POOL:", transactionPool.transactionMap)



// // // const tokenContract = new TokenContract(token,blockchain)

// // // console.log({tokenContract})


// // // token.initialize({owner: sender, blockchain})

// // // // console.log("token")

// // // // const transactionCost = 0.002

// // // console.log("token:::", {token})

// // // transactionPool.setTransaction(token)

// // // console.log("transactionMap:", transactionPool.transactionMap)

// // // console.log(blockchain.chain)

// // // token.transfer(sender, recipient, 100, transactionCost)

