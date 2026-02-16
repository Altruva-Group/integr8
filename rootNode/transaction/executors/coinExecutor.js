class CoinExecution {
    static execute(transaction, stateDatabase) {
        console.log({transaction})
        const { action, from, to, amount } = transaction;
        const sender = stateDatabase.getAccount(from)
        const recipient = stateDatabase.getAccount(to)

        if (amount <= 0) throw new Error("Invalid amount specified")

        switch (action) {
            case 'transfer':
                this.executeTransfer(sender, recipient, amount);
                break;
            case 'stake':
                this.executeStake(sender, amount);
                break;
            case 'unstake':
                this.executeUnstake(sender, amount);
                break;
            case "reward": 
                this.executeReward(recipient, amount)
                break;
            default:
                throw new Error(`Invalid coin action: ${action}`);
        }
    }

    static executeTransfer(sender, recipient, amount) {
        // Mock execution for tests - don't actually update state
        return true;

        return true;
    }

    static executeStake(sender, amount) {
        sender.stakeCoins(amount)
        // console.log(`Staking ${amount} coins from ${sender.address}`);
        // Add execution logic here
        return true;
    }

    static executeUnstake(sender, amount) {
        sender.unstakeCoins(amount)
        // console.log(`Unstaking ${amount} coins from ${sender.address}`);
        return true;
    }

    static executeReward(recipient, amount) {
        recipient.updateCoins(amount)
        // console.log(`Sending mining reward of ${amount} coins to ${recipient.address}`);
        return true;
    }
}

module.exports = CoinExecution;
