const { randomUUID } = require("crypto");
// const { v4: uuid } = require("uuid");

class Token {
    constructor({ca, name, symbol, logo, totalSupply, owner, paused = false, frozen = false, locked = false, supplyCap = null, eol = null}) {
        this.ca = ca || this.generateCA();
        this.name = name;
        this.symbol = symbol;
        this.logo = logo;
        this.totalSupply = totalSupply;
        this.owner = owner.publicKey || owner;
        this.balances = new Map();
        this.allowances = new Map();
        this.frozenAccounts = new Set();
        this.paused = paused; // trade
        this.supplyCap = supplyCap;
        this.roles = new Map();
        this.blacklistedAccounts = new Set();
        this.lockedTokens = new Map();
        this.stakedTokens = new Map();
        this.eol = this.setEOL(eol);
        this.frozen = frozen; // mint/burn;
        this.locked = locked; // upgrade/set-supply-cap;

        this.initialize();
    }

    generateCA() {
        return `0x${randomUUID().split("-").join("")}`;
        // return `0x755c62f93da247379bfb78ec86fbcb9f`;
    }

    initialize() {
        this.balances.set(this.owner, this.totalSupply);
        this.roles.set(this.owner, { minter: true, burner: true, admin: true });
    }

    // Serialize the token instance to JSON
    toJSON() {
        return {
            ca: this.ca,
            name: this.name,
            symbol: this.symbol,
            logo: this.logo,
            totalSupply: this.totalSupply,
            owner: this.owner,
            paused: this.paused,
            supplyCap: this.supplyCap,
            eol: this.eol,
            balances: Array.from(this.balances.entries()),
            allowances: Array.from(this.allowances.entries()),
            frozenAccounts: Array.from(this.frozenAccounts),
            roles: Array.from(this.roles.entries()),
            blacklistedAccounts: Array.from(this.blacklistedAccounts),
            lockedTokens: Array.from(this.lockedTokens.entries()),
            stakedTokens: Array.from(this.stakedTokens.entries()),
            frozen: this.frozen,
            locked: this.locked
        };
    }

    // Deserialize the token instance from JSON
    static fromJSON(json) {
        const token = new Token({
            ca: json.ca,
            name: json.name,
            symbol: json.symbol,
            logo: json.logo,
            totalSupply: json.totalSupply,
            owner: json.owner, 
            paused: json.paused,
            supplyCap: json.supplyCap,
            eol: json.eol,
            frozen: json.frozen,
            locked: json.locked
        });
        
        token.balances = new Map(json.balances);
        token.allowances = new Map(json.allowances);
        token.frozenAccounts = new Set(json.frozenAccounts);
        token.roles = new Map(json.roles);
        token.blacklistedAccounts = new Set(json.blacklistedAccounts);
        token.lockedTokens = new Map(json.lockedTokens);
        token.stakedTokens = new Map(json.stakedTokens);
        
        return token;
    }

    // set token validity in number of days 
    setEOL(eol) {
        return eol ? Date.now() + 1000 * 60 * 60 * 24 * eol : null
    }

    // Check if the token has expired
    hasExpired() {
        if (this.eol !== null && Date.now() > this.eol) {
            throw new Error("Asset has expired and is no longer valid");
        }
    }

    // Check if tokens can be transferred between accounts
    transferable(from, to) {
        this.hasExpired();
        this._onlyWhenNotPaused();
        this._onlyIfNotFrozen(from);
        this._onlyIfNotFrozen(to);
        this._onlyIfNotBlacklisted(from);
        this._onlyIfNotBlacklisted(to);

        return true;
    }

    // mintable () {
    //     return this.frozen;
    // }

    upgrade(owner, newFeatures) {
        this._onlyAdmin(owner);
        if (this.locked) throw new Error("This asset is locked. Asset no longer upgradable");

        // console.log("newFeatures", {newFeatures})

        this.name = newFeatures.name;
        this.symbol = newFeatures.symbol;
        this.logo = newFeatures.logo;
    }

    // Transfer tokens to another address
    setBalances({owner, recipient, amount}) {
        // console.log({owner, recipient, amount})
        this._onlyWhenNotPaused();
        this._onlyIfNotFrozen(owner);

        const ownerBalance = this.balances.get(owner) || 0;
        if (ownerBalance < amount) throw new Error("Insufficient balance");
        // console.log("owner balance B4:", {ownerBalance})

        this.balances.set(owner, ownerBalance - amount);

        if (recipient) {
            this._onlyIfNotFrozen(recipient);
            this.balances.set(recipient, (this.balances.get(recipient) || 0) + amount);
        }
    }

    mintToken(to, amount) {
        this.hasExpired();
        this._onlyMinter(to);
        this._checkSupplyCap(amount);
        this._onlyAdmin(to)

        if (this.frozen) throw new Error("New assets can not be minted. This asset is locked")

        this.totalSupply += amount;
        this.balances.set(to, (this.balances.get(to) || 0) + amount);
    }

    burn(from, amount) {
        this.hasExpired();
        // this._onlyBurner();
        // this._onlyAdmin(from)


        const balance = this.balances.get(from) || 0;
        if (balance < amount) throw new Error("Insufficient balance");

        this.totalSupply -= amount;
        this.balances.set(from, balance - amount);
    }
    
    pause(owner) {
        this.hasExpired();
        this._onlyAdmin(owner);

        if (this.paused) throw new Error('Asset is already paused.');

        this.paused = true;
    }

    unpause(owner) {
        this.hasExpired();
        this._onlyAdmin(owner);

        if (!this.paused) throw new Error('Asset is not paused.');

        this.paused = false;
    }

    freeze(owner) {
        this.hasExpired();
        this._onlyAdmin(owner);

        if (this.frozen) throw new Error('Asset is already frozen.');

        this.frozen = true;
    }

    unfreeze(owner) {
        this.hasExpired();
        this._onlyAdmin(owner);

        console.log("this.frozen:", this.frozen)
        if (!this.frozen) throw new Error('Asset is not frozen.');

        this.frozen = false;
    }

    lock(owner) {
        this.hasExpired();
        this._onlyAdmin(owner);

        if (this.locked) throw new Error('Asset is already locked.');

        this.locked = true;
    }

    unlock(owner) {
        this.hasExpired();
        this._onlyAdmin(owner);
        
        if (!this.locked) throw new Error('Asset is not locked.');

        this.locked = false;
    }

    // freezeAccount(account) {
    //     this.hasExpired();
    //     this._onlyAdmin();
    //     this.frozenAccounts.add(account);
    // }

    // unfreezeAccount(account) {
    //     this.hasExpired();
    //     this._onlyAdmin();
    //     this.frozenAccounts.delete(account);
    // }
    
    // lockTokens(account, amount) {
    //     this.hasExpired();
    //     this._onlyAdmin();
    //     const balance = this.balances.get(account) || 0;
    //     if (balance < amount) throw new Error("Insufficient balance");

    //     this.balances.set(account, balance - amount);
    //     this.lockedTokens.set(account, (this.lockedTokens.get(account) || 0) + amount);
    // }

    // unlockTokens(account, amount) {
    //     this.hasExpired();
    //     this._onlyAdmin();
    //     const lockedAmount = this.lockedTokens.get(account) || 0;
    //     if (lockedAmount < amount) throw new Error("Insufficient locked tokens");

    //     this.lockedTokens.set(account, lockedAmount - amount);
    //     this.balances.set(account, (this.balances.get(account) || 0) + amount);
    // }


    setSupplyCap(owner, cap) {
        this.hasExpired();
        this._onlyAdmin(owner);
        if (cap < this.totalSupply) throw new Error("Cap cannot be less than current total supply");
        this.supplyCap = cap;
    }

    setRole(account, role, value) {
        this.hasExpired();
        this._onlyAdmin();
        const roles = this.roles.get(account) || {};
        roles[role] = value;
        this.roles.set(account, roles);
    }

    // Approve a spender to spend tokens on behalf of the owner (DEX and other 3rd party apps)
    approveSpender(owner, spender, amount) {
        this.hasExpired();
        this.allowances.set(`${owner}_${spender}`, amount);
    }

    // Check if tokens are transferable from one account to another via a spender
    transferThroughSpender(from, to, amount, spender) {
        this.transferable(from, to, amount);

        const allowance = this.allowances.get(`${from}_${spender}`) || 0;
        if (allowance < amount) throw new Error("Allowance exceeded");

        const fromBalance = this.balances.get(from) || 0;
        if (fromBalance < amount) throw new Error("Insufficient balance");

        this.balances.set(from, fromBalance - amount);
        this.balances.set(to, (this.balances.get(to) || 0) + amount);
        this.allowances.set(`${from}_${spender}`, allowance - amount);
    }

    swapToken({senderWallet, recipientWallet, amount1, amount2, token2}) {
        // Decrement sender's balance of token1 by amount1
        let senderBalance1 = this.balances.get(senderWallet) || 0;
        if (senderBalance1 < amount1) {
            console.error(`Insufficient ${this.name} balance. Aborting swap.`);
            return;
        }
        this.balances.set(senderWallet, senderBalance1 - amount1);
    
        // Decrement recipient's balance of token2 by amount2
        let recipientBalance2 = token2.balances.get(recipientWallet) || 0;
        if (recipientBalance2 < amount2) {
            console.error(`Insufficient ${token2.name} balance. Aborting swap.`);
            return;
        }
        token2.balances.set(recipientWallet, recipientBalance2 - amount2);
    
        // Increment sender's balance of token2 by amount2
        let senderBalance2 = token2.balances.get(senderWallet) || 0;
        token2.balances.set(senderWallet, senderBalance2 + amount2);
    
        // Increment recipient's balance of token1 by amount1
        let recipientBalance1 = this.balances.get(recipientWallet) || 0;
        this.balances.set(recipientWallet, recipientBalance1 + amount1);
    }
    // swapTokens(from, to, amount) {
    //     this.transferable(from, to, amount);
        
    //     const fromBalance = this.balances.get(from) || 0;
    //     if (fromBalance < amount) throw new Error("Insufficient balance");

    //     this.balances.set(from, fromBalance - amount);
    //     this.balances.set(to, (this.balances.get(to) || 0) + amount);
    // }

    buy() {};

    sell() {};

    blacklistAccount(account) {
        this.hasExpired();
        this._onlyAdmin();
        this.blacklistedAccounts.add(account);
    }

    unblacklistAccount(account) {
        this.hasExpired();
        this._onlyAdmin();
        this.blacklistedAccounts.delete(account);
    }

    stakeTokens(account, amount, duration) {
        this.hasExpired();
        this._onlyAdmin();
        const balance = this.balances.get(account) || 0;
        if (balance < amount) throw new Error("Insufficient balance");

        this.balances.set(account, balance - amount);
        this.stakedTokens.set(account, { amount, duration });
    }

    buyBackTokens(account, amount) {
        this.hasExpired();
        this._onlyAdmin();

        const balance = this.balances.get(account) || 0;
        if (balance < amount) throw new Error("Insufficient balance");

        this.balances.set(account, balance - amount);
        this.totalSupply -= amount;
    }

    upgradeContract(newData) {
        this.hasExpired();
        this._onlyAdmin();
        this.updateFromJSON(newData);
    }

    releaseTokens(account, amount) {
        this.hasExpired();
        this._onlyAdmin();
        const balance = this.balances.get(account) || 0;
        this.balances.set(account, balance + amount);
        this.totalSupply += amount;
    }

    // private methods
    
    _onlyAdmin(owner) {
        const roles = this.roles.get(this.owner) || {};
        // console.log({roles})
        if (!roles.admin) throw new Error("Not authorized to perform this action");
        // console.log(this.owner, {owner})
        if (this.owner !== owner) throw new Error("Not authorized to perform this action. Only the asset contract creator can perform this action");
    }

    _onlyIfNotFrozen(account) {
        if (this.frozenAccounts.has(account)) throw new Error("Account is frozen");
    }

    _onlyWhenNotPaused() {
        if (this.paused) throw new Error("Asset transfers are paused");
    }

    _onlyMinter(owner) {
        const roles = this.roles.get(this.owner) || {};

        if (this.owner !== owner) throw new Error("Not authorized to mint more of this asset");
        if (!roles.minter) throw new Error("Not authorized to mint more of this asset");
    }

    // _onlyBurner() {
    //     const roles = this.roles.get(this.owner) || {};
    //     if (!roles.burner) throw new Error("Not authorized to burn tokens");
    // }

    _onlyIfNotBlacklisted(account) {
        if (this.blacklistedAccounts.has(account)) throw new Error("Account is blacklisted");
    }
    
    _checkSupplyCap(amount) {
        if (this.totalSupply > amount) return false;

        return true;
    }
}

module.exports = Token;