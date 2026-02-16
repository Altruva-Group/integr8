const { TOKEN_CREATION_FEE } = require("../../fees");
const deepCopy = require("../../utils/deepCopy");

class TokenExecutor {
    static execute(transaction, stateDatabase, blockchain) {
        const { action, from, to, amount, token } = transaction;
        const sender = stateDatabase.getAccount(from)
        const recipient = stateDatabase.getAccount(to)

        // recipient
        let recipientTokens = deepCopy(recipient?.tokens)
        let recipientToken = recipientTokens?.get(token.ca) || null; 

            // No token creation fee or transaction cost deduction

        switch (action) {
            case 'create':
                this.executeTokenCreate(sender, token, blockchain);
                break
            case 'transfer':
                this.executeTokenTransfer(sender, recipient, token, amount, blockchain);
                break
            case 'buy':
                this.executeTokenBuy(sender, recipient, token, amount, blockchain);
                break
            case 'sell':
                this.executeTokenSell(sender, recipient, token, amount, blockchain);
                break
            case 'mint':
                this.executeTokenMint(sender, token, amount, blockchain);
                break
            case 'burn':
                this.executeTokenBurn(sender, token, amount, blockchain);
                break
            case 'swap':
                this.executeTokenSwap(sender, recipient, token, amount, blockchain);
                break
            case 'stake':
                this.executeTokenStake(sender, recipient, token, amount, blockchain);
                break
            case 'unstake':
                this.executeTokenUnstake(sender, recipient, token, amount, blockchain);
                break
            default:
                throw new Error(`Invalid token action: ${action}`);
        }
    }

    static executeTokenCreate(sender, token, blockchain) {
        blockchain.tokens.set(token.ca, token)
            // No token creation fee deduction
        sender.updateTokens(token.ca, token, token.totalSupply, true);
        // console.log(`Creating token ${token.symbol} with supply ${token.totalSupply} for ${sender.address}`);
        return true;
    }

    static executeTokenTransfer(sender, recipient, token, amount, blockchain) {
        console.log(`Transferring ${amount} tokens from ${sender.address} to ${recipient.address}`);
        sender.updateTokens(token.ca, token, amount, false)
        recipient.updateTokens(token.ca, token, amount, true)
        console.log(`Transferred ${amount} tokens from ${sender.address} to ${recipient.address}`);

        token.setBalances({owner: sender.address, recipient: recipient.address, amount})
        blockchain.tokens.set(token.ca, token)
        return true;
    }

    static executeTokenBuy(sender, recipient, token, amount, blockchain) {
        const {amount1, amount2} = amount
        // Execution logic for buying tokens (with coin)
        // console.log({amount1, amount2})
        // coin
        sender.updateCoins(-amount1)
        recipient.updateCoins(amount1)
        // token
        sender.updateTokens(token.ca, token, amount2, true)
        recipient.updateTokens(token.ca, token, amount2, false)
        // console.log({sender, recipient})

        token.setBalances({owner: recipient.address, recipient: sender.address, amount: amount2})
        console.log({token})
        blockchain.tokens.set(token.ca, token)
        console.log(`Bought ${amount2} tokens from ${recipient.address} using ${amount1} coins`);
        // Implement buy logic (e.g., transfer coins to the token issuer and give tokens)
        return true;
    }

    static executeTokenSell(sender, recipient, token, amount, blockchain) {
        const {amount1, amount2} = amount
        // Execution logic for buying tokens (with coin)
        // console.log({amount1, amount2})
        // coin
        sender.updateCoins(amount2)
        recipient.updateCoins(-amount2)
        // token
        sender.updateTokens(token.ca, token, amount1, false)
        recipient.updateTokens(token.ca, token, amount1, true)
        // console.log({sender, recipient})

        token.setBalances({owner: sender.address, recipient: recipient.address, amount: amount1})
        console.log({token})
        blockchain.tokens.set(token.ca, token)
        console.log(`Sold ${amount1} tokens to ${recipient.address} for ${amount2} coins`);
        // Implement buy logic (e.g., transfer coins to the token issuer and give tokens)
        return true;
    }

    static executeTokenMint(sender, token, amount, blockchain) {
        token.mintToken(sender.address, amount)
        blockchain.tokens.set(token.ca, token)

        sender.updateCoins(-TOKEN_CREATION_FEE);
        sender.updateTokens(token.ca, token, amount, true);        
        console.log(`Minting ${token.ca} new ${amount} token assets for ${sender.address}`);
        return true;
    }

    static executeTokenBurn(sender, token, amount, blockchain) {
        token.burn(sender.address, amount)
        blockchain.tokens.set(token.ca, token)

        sender.updateCoins(-TOKEN_CREATION_FEE);
        sender.updateTokens(token.ca, token, amount, false);        
        // console.log(`Burning ${token.ca} ${amount} token assets from ${sender.address}`);
        return true;
    }

    static executeTokenSwap(sender, recipient, token, amount, blockchain) {
        const {token1, token2} = token;
        const {amount1, amount2} = amount;

        token1.swapToken({
            senderWallet: sender.address,
            recipientWallet: recipient.address,
            amount1,
            amount2,
            token2
        })

        // token1
        sender.updateTokens(token1.ca, token1, amount1, false)
        recipient.updateTokens(token1.ca, token1, amount1, true)
        // token2
        sender.updateTokens(token2.ca, token2, amount2, true)
        recipient.updateTokens(token2.ca, token2, amount2, false)

        blockchain.tokens.set(token1.ca, token1)
        blockchain.tokens.set(token2.ca, token2)
        // console.log(`Swapped ${token1.ca} from ${sender.address} with ${token2.ca} from ${recipient.address}`);
        return true;
    }

    static executeTokenStake(sender, amount) {
        // Execution logic for staking tokens
        console.log(`Staking ${amount} tokens from ${sender}`);
        // Implement staking logic
        return true;
    }

    static executeTokenUnstake(sender, amount) {
        // Execution logic for unstaking tokens
        console.log(`Unstaking ${amount} tokens from ${sender}`);
        // Implement unstaking logic
        return true;
    }
}

module.exports = TokenExecutor;
