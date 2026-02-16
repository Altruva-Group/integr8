class Account {
    constructor(address) {
        this.address = address;
        this.coins = 0;
        this.tokens = new Map(); 
        this.nfts = new Map();  
        this.unmintedNfts = new Set();  
        this.stakedCoins = 0; 
        this.stakingStart = null; 
        this.stakingRewards = 0; 
        this.stakedTokens = new Map(); 
        this.tokenStakingStart = new Map(); 
    }

    updateCoins(amount) {
        console.log('Updating coins for account:', {
            address: this.address,
            currentBalance: this.coins,
            updateAmount: amount,
            newBalance: this.coins + amount
        });

        // Validate for negative balance
        if (this.coins + amount < 0) {
            throw new Error(`Invalid balance update: would result in negative balance of ${this.coins + amount}`);
        }

        this.coins += amount;
        
        // Validate the update was successful
        if (isNaN(this.coins)) {
            throw new Error('Balance update resulted in invalid amount');
        }
    }

    updateTokens(tokenCA, token, amount, add) {
        let balance = 0;
        if (tokenCA !== token.ca) throw new Error("Invalid token asset specified")

        const foundToken = this.tokens.get(tokenCA);

        if (foundToken) {
            balance = foundToken.balance;
        }

        if (add) {
            // console.log("1:", {balance, token, foundToken})

            if (!foundToken) {
                const newToken = {
                    ca: token.ca,
                    name: token.name,
                    symbol: token.symbol,
                    logo: token.logo,
                    balance: amount
                }

                this.tokens.set(newToken.ca, newToken);
            }
            else {
                const newToken = {
                    ca: token.ca,
                    name: token.name,
                    symbol: token.symbol,
                    logo: token.logo,
                    balance: balance+amount
                }

                this.tokens.set(newToken.ca, newToken);
            }
        } else {
            // console.log("2:", {balance, foundToken})
            if (!foundToken) throw new Error("Invalid asset. You do not have this asset.");
            if (balance < amount) throw new Error("Invalid balance. You do not have sufficient balance for this transaction.");

            balance -= amount;

            if (balance <= 0) {
                this.tokens.delete(tokenCA);
            } else {
                const newToken = {
                    ca: token.ca,
                    name: token.name,
                    symbol: token.symbol,
                    logo: token.logo,
                    balance: balance
                }
                this.tokens.set(newToken.ca, newToken);
            }
        }

    }

    updateNfts(nftId, nft, add) {
        if (add) {
            this.nfts.set(nftId, nft);
        } else {
            this.nfts.delete(nftId);
        }
    }

    swapTokens(tokenId1, amount1, tokenId2, amount2, otherAccount) {
        if (!this.tokens.get(tokenId1) || this.tokens.get(tokenId1) < amount1) {
            throw new Error(`Insufficient balance of token ${tokenId1} in this account.`);
        }
        if (!otherAccount.tokens.get(tokenId2) || otherAccount.tokens.get(tokenId2) < amount2) {
            throw new Error(`Insufficient balance of token ${tokenId2} in the other account.`);
        }

        const token1 = this.tokens.get(tokenId1)
        const token2 = this.tokens.get(tokenId2)

        this.updateTokens(tokenId1, token1, amount1, false);  // Deduct token1 from this account
        this.updateTokens(tokenId2, token2, amount2, true);   // Add token2 to this account

        otherAccount.updateTokens(tokenId2, token2,amount2, false); // Deduct token2 from other account
        otherAccount.updateTokens(tokenId1, token1, amount1, true);  // Add token1 to other account
    }

    tradeTokens(tokenId, tokenAmount, coinAmount, isBuying) {
        const token = this.tokens.get(tokenId);

        if (isBuying) {
            // Buy tokens: Check if the account has enough coins
            if (this.coins < coinAmount) {
                throw new Error(`Insufficient coins. You need ${coinAmount} coins.`);
            }


            // Deduct coins and add tokens
            this.updateCoins(-coinAmount); // Deduct coins
            this.updateTokens(tokenId, token, tokenAmount, true); // Add tokens
        } else {
            // Sell tokens: Check if the account has enough tokens
            if (!this.tokens.get(tokenId) || this.tokens.get(tokenId) < tokenAmount) {
                throw new Error(`Insufficient balance of token ${tokenId}.`);
            }

            // Deduct tokens and add coins
            this.updateTokens(tokenId, token, tokenAmount, false); // Deduct tokens
            this.updateCoins(coinAmount); // Add coins
        }
    }

    stakeCoins(amount) {
        if (amount <= 0) throw new Error('Amount must be greater than zero.');
        if (amount > this.coins) throw new Error('Insufficient coins to stake.');

        this.updateCoins(-amount); 
        this.stakedCoins += amount; 
        this.stakingStart = new Date(); 
    }

    unstakeCoins(amount) {
        if (amount <= 0) throw new Error('Amount must be greater than zero.');
        if (amount > this.stakedCoins) throw new Error('Insufficient staked coins to unstake.');

        // Calculate rewards before unstaking
        this.calculateCoinRewards(); 

        this.stakedCoins -= amount; // Deduct from staked coins
        this.updateCoins(amount); // Add back to available balance
    }

    stakeTokens(tokenId, amount) {
        const token = this.tokens.get(tokenId);

        if (amount <= 0) throw new Error('Amount must be greater than zero.');
        if (!this.tokens.get(tokenId) || this.tokens.get(tokenId) < amount) throw new Error('Insufficient tokens to stake.');

        this.updateTokens(tokenId, token, amount, false); // Deduct tokens from available balance
        if (!this.stakedTokens.has(tokenId)) {
            this.stakedTokens.set(tokenId, 0); // Initialize staked amount for the token
            this.tokenStakingStart.set(tokenId, new Date()); // Track staking start time for this token
        }
        this.stakedTokens.set(tokenId, this.stakedTokens.get(tokenId) + amount); // Add to staked tokens
    }

    unstakeTokens(tokenId, amount) {
        const token = this.tokens.get(tokenId);

        if (amount <= 0) throw new Error('Amount must be greater than zero.');
        if (!this.stakedTokens.get(tokenId) || this.stakedTokens.get(tokenId) < amount) throw new Error('Insufficient staked tokens to unstake.');

        // Calculate rewards if needed
        this.calculateTokenRewards(tokenId);

        this.stakedTokens.set(tokenId, this.stakedTokens.get(tokenId) - amount); // Deduct from staked tokens
        if (this.stakedTokens.get(tokenId) === 0) {
            this.stakedTokens.delete(tokenId);
            this.tokenStakingStart.delete(tokenId);
        }
        this.updateTokens(tokenId, token, amount, true); // Add back to available balance
    }

    calculateCoinRewards() {
        if (!this.stakingStart) return; // No rewards if staking hasn't started

        const rewardRate = 0.05; // Example: 5% annual reward rate
        const stakingDuration = (new Date() - this.stakingStart) / (1000 * 60 * 60 * 24 * 365); // Duration in years
        this.stakingRewards = this.stakedCoins * rewardRate * stakingDuration;
    }

    calculateTokenRewards(tokenId) {
        if (!this.tokenStakingStart.has(tokenId)) return; // No rewards if staking hasn't started for this token

        const rewardRate = 0.02; // Example: 2% annual reward rate for tokens
        const stakingDuration = (new Date() - this.tokenStakingStart.get(tokenId)) / (1000 * 60 * 60 * 24 * 365); // Duration in years
        const stakedAmount = this.stakedTokens.get(tokenId);
        const rewards = stakedAmount * rewardRate * stakingDuration;
        this.stakingRewards += rewards; // Add token rewards to overall staking rewards
    }

    getStakingStatus() {
        return {
            stakedCoins: this.stakedCoins,
            stakedTokens: Array.from(this.stakedTokens.entries()),
            stakingRewards: this.stakingRewards,
            stakingStart: this.stakingStart,
            tokenStakingStart: Array.from(this.tokenStakingStart.entries())
        };
    }
}

module.exports = Account;
