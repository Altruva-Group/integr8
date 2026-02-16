// const { v1: uuid } = require("uuid");
const { cryptoHash } = require("../hash");
// Fees and mining removed for auto-mining mode
const { REWARD_INPUT } = require("../config");
const Token = require("../token");
const NFT = require("../nft");

// validators
const CoinValidator = require('./validators/coinValidator');
const TokenValidator = require('./validators/tokenValidator');
const NftValidator = require('./validators/nftValidator');

// executors
const CoinExecutor = require('./executors/coinExecutor');
const TokenExecutor = require('./executors/tokenExecutor');
const NftExecutor = require('./executors/nftExecutor');

class Transaction {
    constructor({ type, action, nonce, from, to, signature, amount, token = null, nft = null}) {
        this.id = this.initialize();
        this.type = type; 
        this.action = action;
        this.nonce = nonce;
        this.from = from;
        this.to = to;
        this.amount = amount; 
        this.token = token; 
        this.nft = nft;
        this.signature = signature;
        this.transactionCost = this.calculateTransactionCost({ amount, token, nft});
    }

    initialize() {
        return cryptoHash(this.type, this.action, this.nonce, this.from, this.to, this.amount, this.token, this.nft, this.signature);
    }

    static fromObject(obj) {
        return new Transaction({
            nonce: obj.nonce,
            from: obj.from,
            to: obj.to,
            type: obj.type,
            action: obj.action,
            amount: obj.amount,
            token: Token.fromJSON(obj.token),
            nft: NFT.fromJSON(obj.nft),
            signature: obj.signature,
            transactionCost: obj.transactionCost
        });
    }

    validate(stateDatabase, blockchain){
        switch (this.type) {
            case 'coin':
                CoinValidator.validate(this, stateDatabase);
                break
            case 'token':
                TokenValidator.validate(this, stateDatabase);
                break
            case 'nft':
                NftValidator.validate(this, stateDatabase, blockchain);
                break
            default:
                throw new Error(`Unknown transaction type: ${this.type}`);
        }

        return true
    }

    static update({ type, action, from, to, amount, oldTransaction, signature, token = null, nft = null}) {
        const newNonce = oldTransaction.nonce + 1;

        const newTransaction = new Transaction({ type, action, nonce: newNonce, from, to, amount, token, nft, signature, action });

        newTransaction.id = newTransaction.initialize();
        // console.log(newTransaction.id)

        return newTransaction;
    }
    
    execute(stateDatabase, blockchain) {
        // console.log("tx", this)
        // console.log("tx type", this.type)
        switch(this.type) {
            case 'coin':
                CoinExecutor.execute(this, stateDatabase);
                break;
            case 'token':
                TokenExecutor.execute(this, stateDatabase, blockchain);
                break;
            case 'nft':
                NftExecutor.execute(this, stateDatabase, blockchain);
                break;
            default:
                throw new Error(`Unknown transaction type: ${this.type}`);
        }


        return true
    }
    

    calculateTransactionCost({ amount, token, nft}) {
        // In auto-mined mode we no longer charge transaction fees.
        // Keep the method for compatibility but always return 0.
        return 0;
    }

    static rewardTransaction(wallet) {
        // Reward transactions are deprecated in auto-mined mode. Return null for compatibility.
        return null;
    }
}

module.exports = Transaction;
