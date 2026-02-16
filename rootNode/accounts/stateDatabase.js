const Account = require(".");

class StateDatabase {
    constructor () {
        this.accounts = new Map();
        this.blockchain = null;
    }

    setBlockchain(blockchain) {
        this.blockchain = blockchain;
        // Initialize accounts from blockchain if available
        if (blockchain && blockchain.accounts) {
            this.accounts = new Map(blockchain.accounts);
        }
    }

    getAccount(address) {
        if (!this.accounts.has(address)) {
            return false;
        }
        return this.accounts.get(address);
    }

    createAccount(address) {
        if (!this.accounts.has(address)) {
            const newAccount = new Account(address);
            this.accounts.set(address, newAccount);

            if (this.blockchain) {
                this.blockchain.addAccount(address, newAccount);
            }
        }
        return this.accounts.get(address);
    }
}

module.exports = StateDatabase;