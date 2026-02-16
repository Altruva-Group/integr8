const { verifySignature } = require("../../hash");
const deepCopy = require("../../utils/deepCopy");

class TokenValidator {
    static validate(transaction, stateDatabase) {
        const { type, action, from, to, amount, token, signature } = transaction;

        const sender = stateDatabase.getAccount(from);
        const recipient = stateDatabase.getAccount(to);

        // sender
        let senderTokens = deepCopy(sender.tokens)
        let senderToken = senderTokens?.get(token.ca) // || null; 
        // recipient
        let recipientTokens = deepCopy(recipient?.tokens)
        let recipientToken = recipientTokens?.get(token.ca) // || null; 

        // console.log({senderToken, recipientToken})

        if (!sender) throw new Error("Invalid owner account");
        if (sender.coins < 0.001) throw new Error("Insufficient balance for this transaction")
        if (typeof amount === "number" && amount <= 0) throw new Error("Invalid amount specified. Amount must be greater than zero.")

        switch (action) {
            case 'create':
                this.validateTokenCreate(type, action, sender, amount, token, signature);
                break;
            case 'transfer':
                this.validateTokenTransfer(type, action, sender, recipient, amount, token, senderToken, signature);
                break;
            case 'buy':
                this.validateTokenBuy(type, action, sender, recipient, token, amount, recipientToken, signature);
                break;
            case 'sell':
                this.validateTokenSell(type, action, sender, recipient, token, amount, senderToken, signature);
                break;
            case 'mint':
                this.validateTokenMint(type, action, sender, token, amount, signature);
                break;
            case 'burn':
                this.validateTokenBurn(type, action, sender, token, amount, senderToken, signature);
                break;
            case 'swap':
                this.validateTokenSwap(type, action, sender, recipient, token, amount, senderToken, recipientToken, senderTokens, recipientTokens, signature);
                break; 
            case 'stake':
                this.validateTokenStake(type, action, sender, token, amount, signature);
                break;
            case 'unstake':
                this.validateTokenUnstake(type, action, sender, token, amount, signature);
                break;
            default:
                throw new Error(`Invalid token action: ${action}`);
        }
    }

    static validateTokenCreate(type, action, sender, amount, token, signature) {
        if (!token || !token.name || !token.symbol || !token.logo || !token.totalSupply) {
            throw new Error('Token data (name,symbol, logo and supply) must be provided.');
        }
        if (amount <= 0) throw new Error("Token supply must be greater than 0");
        if (sender.coins < 0.0509) throw new Error("Sender balance is not sufficient for this transaction");

        // { data: { wallet, token: {name, symbol, logo}, amount: totalSupply }
        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, token: {name: token.name, symbol: token.symbol, logo: token.logo}, amount, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);

        return true;
    }

    static validateTokenTransfer(type, action, sender, recipient, amount, token, senderToken, signature) {

        if (!recipient) {
            throw new Error('Recipient addresses must be provided.');
        }
        if (!senderToken || senderToken <= 0) {
            throw new Error('Transfer amount must be greater than zero.');
        }
        if (senderToken < amount) {
            throw new Error('Insufficient token balance for this transactions');
        }

        // signTransaction({ data: { wallet, token: token.ca, amount, recipient, type, action: "transfer" });
        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, token: token.ca, amount, recipient: recipient.address, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);

        return true;
    }

    static validateTokenBuy(type, action, sender, recipient, token, amount, recipientToken, signature) {
        const {amount1, amount2} = amount;

        if (amount1 <= 0 || amount2 <= 0) {
            throw new Error('Invalid amount specified.');
        }
        if (!sender || !recipient) {
            throw new Error('Sender and recipient addresses must be provided.');
        }
        if (sender.coins <= amount1) {
            throw new Error('Insufficient coins balance for swap.');
        }
        if (!recipientToken || recipientToken < amount2) {
            throw new Error('Insufficient token balance for swap.');
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, recipient: recipient.address, tokenCA: token.ca, amount: {amount1, amount2}, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction signature from ${sender.address}`);
        return true;
    }

    static validateTokenSell(type, action, sender, recipient, token, amount, senderToken, signature) {
        const {amount1, amount2} = amount;

        if (amount1 <= 0 || amount2 <= 0) {
            throw new Error('Invalid amount specified.');
        }
        if (!sender || !recipient) {
            throw new Error('Sender and recipient addresses must be provided.');
        }
        if (recipient.coins <= amount2) {
            throw new Error('Insufficient coins balance for swap.');
        }
        if (!senderToken || senderToken < amount1) {
            throw new Error('Insufficient token balance for swap.');
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, recipient: recipient.address, tokenCA: token.ca, amount: {amount1, amount2}, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction signature from ${sender.address}`);
        return true;
    }

    static validateTokenMint(type, action, sender, token, amount, signature) {
        if (!sender) {
            throw new Error('Sender must be provided for token minting.');
        }
        if (amount <= 0) {
            throw new Error('Mint amount must be greater than zero.');
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, token: token.ca, amount, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        return true;
    }

    static validateTokenBurn(type, action, sender, token, amount, senderToken, signature) {
        if (!sender) {
            throw new Error('Sender must be provided for token burning.');
        }
        if (!senderToken || senderToken < amount) {
            throw new Error('You do not own this asset.');
        }
        if (amount <= 0) {
            throw new Error('Burn amount must be greater than zero.');
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, token: token.ca, amount, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        return true;
    }

    static validateTokenSwap(type, action, sender, recipient, token, amount, senderToken, recipientToken, senderTokens, recipientTokens, signature) {
        const {token1, token2} = token;
        const {amount1, amount2} = amount;

        if (amount1 <= 0 || amount2 <= 0) {
            throw new Error('Invalid amount specified.');
        }
        if (!senderToken || !recipientToken){
            // sender
            senderToken = senderTokens?.get(token1.ca) 
            // recipient
            recipientToken = recipientTokens?.get(token2.ca)
            
        }
        if (!sender || !recipient) {
            throw new Error('Sender and recipient addresses must be provided.');
        }
        if (token1 === token2) {
            throw new Error('You can not swap the same token.');
        }
        // console.log(senderToken, recipientToken, amount1, amount2)
        if ((!senderToken || senderToken < amount1) || (!recipientToken || recipientToken < amount2)) {
            throw new Error('Insufficient token balance for swap.');
        }
        // if (token.token1 || token.token2) {}// check tokens?
        // { data: { wallet, token: {token1: token1.ca, token2: token2.ca}, amount: {amount1, amount2}, recipient, type, action: "swap" }
        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, token: {token1: token1.ca, token2: token2.ca}, amount: {amount1, amount2}, recipient: recipient.address, type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        return true;
    }

    static validateTokenStake(sender, amount) {
        if (!sender) {
            throw new Error('Sender must be provided for token staking.');
        }
        if (amount <= 0) {
            throw new Error('Stake amount must be greater than zero.');
        }
        // Add more staking-specific checks
        return true;
    }

    static validateTokenUnstake(sender, amount) {
        if (!sender) {
            throw new Error('Sender must be provided for token unstaking.');
        }
        if (amount <= 0) {
            throw new Error('Unstake amount must be greater than zero.');
        }
        // Add more unstaking-specific checks
        return true;
    }
}

module.exports = TokenValidator;
