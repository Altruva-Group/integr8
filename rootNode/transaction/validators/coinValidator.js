const { verifySignature } = require("../../hash");

class CoinValidator {
    static validate(transaction, stateDatabase) {
        const { type, action, from, to, amount, signature } = transaction;
        const sender = stateDatabase.getAccount(from)
        const recipient = stateDatabase.getAccount(to)

        // console.log("TRANSACTION FOR VALIDATION:", {transaction})

        if (amount <= 0) {
            throw new Error('Transfer amount must be greater than zero.');
        }

        switch (action) {
            case 'transfer':
                this.validateTransfer(type, action, sender, recipient, amount, signature );
                break;
            case 'stake':
                this.validateStake(type, action, sender, amount, signature );
                break;
            case 'unstake':
                this.validateUnstake(type, action, sender, amount, signature );
                break;
            default:
                throw new Error(`Invalid coin action: ${action}`);
        }

        return true
    }

    static validateTransfer(type, action, sender, recipient, amount, signature ) {
        if (!sender || !recipient) {
            throw new Error('Sender and recipient addresses must be provided.');
        }

        if (sender.coins < amount) {
            throw new Error('Transfer amount is greater than account balance.');
        }

        if (sender.address === recipient.address) {
            throw new Error("You can not send funds to same wallet.");
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, recipient: recipient.address, amount,  type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        
        return true;
    }

    static validateStake(type, action, sender, amount, signature ) {
        if (!sender) {
            throw new Error('Sender address must be provided.');
        }

        if (sender.coins <= amount) {
            throw new Error('Transfer amount is greater than account balance.');
        }

        if ((sender.coins - amount) < 0.001 ) {
            throw new Error("You do not have enough funds for this transaction.");
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, amount,  type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);

        return true;
    }

    static validateUnstake(type, action, sender, amount, signature ) {
        if (!sender) {
            throw new Error('Sender address must be provided.');
        }

        if (sender.stakedCoins < amount) {
            throw new Error('Your staked coin balance is lower than the amount specified');
        }

        const verify = verifySignature({publicKey: sender.address, data: {wallet: sender.address, amount,  type, action}, signature})
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);

        return true;
    }


    // reward validation removed - reward transactions are no longer created in auto-mined mode
}

module.exports = CoinValidator;
