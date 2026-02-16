const NFT = require("../../../rootNode/nft");

class NFTExecution {
    static execute(transaction, stateDatabase, blockchain) {
        const {action, from, to, amount, nft   } = transaction;
        const sender = stateDatabase.getAccount(from);
        const recipient = stateDatabase.getAccount(to);

            // No transaction cost deduction
        
        switch (action) {
            case 'create':
                this.createNFT(sender, nft); // , blockchain
                break;
            case 'mint':
                this.mintNFT(sender, nft, blockchain);
                break;
            case 'transfer':
                this.transferNFT(sender, recipient, nft, blockchain);
                break;
            case 'buy':
                this.buyNFT(sender, recipient, nft, blockchain);
                break;
            case 'list-for-sale':
                this.listNFTForSale(sender, nft, blockchain);
                break;
            case 'upgrade':
                this.upgradeNFT(transaction, stateDatabase);
                break;
            case 'burn':
                this.burnNFT(sender, nft, blockchain);
                break;
            case 'lock':
                this.lockNFT(transaction, stateDatabase);
                break;
            case 'unlock':
                this.unlockNFT(transaction, stateDatabase);
                break;
            default:
                throw new Error(`Unknown NFT action: ${data.action}`);
        }
    }

    static createNFT(sender, nft) { // , blockchain
        // console.log({nft})

        if (nft.length && nft.length > 1) {
            for (const n of nft) sender.unmintedNfts.add(n)
        } else {
            sender.unmintedNfts.add(nft)
        }
        // console.log(sender.nfts)
        return true;
    }

    static mintNFT(sender, nft, blockchain) {
        if (nft.length && nft.length > 1) {
            for (const n of nft) {
                for (const [key, existingNFT] of sender.unmintedNfts.entries()) {
                    if (
                        nft.creator === existingNFT.creator &&
                        nft.owner === existingNFT.owner &&
                        nft.name === existingNFT.name &&
                        nft.url === existingNFT.url &&
                        nft.description === existingNFT.description &&
                        nft.totalSupply === existingNFT.totalSupply &&
                        nft.position === existingNFT.position
                    ) {
                        sender.unmintedNfts.delete(existingNFT)
                    }
                }

                n.mint(sender.address)

                sender.updateNfts(n.ca, n, true)
                blockchain.nfts.set(n.ca, n)
            }
        } else {
            for (const [key, existingNFT] of sender.unmintedNfts.entries()) {
                if (
                    nft.creator === existingNFT.creator &&
                    nft.owner === existingNFT.owner &&
                    nft.name === existingNFT.name &&
                    nft.url === existingNFT.url &&
                    nft.description === existingNFT.description &&
                    nft.totalSupply === existingNFT.totalSupply &&
                    nft.position === existingNFT.position
                ) {
                    sender.unmintedNfts.delete(existingNFT)
                }
            }
            nft.mint(sender.address)
            
            sender.updateNfts(nft.ca, nft, true)
            blockchain.nfts.set(nft.ca, nft)
        }

        return true;
    }

    static transferNFT(sender, recipient, nft, blockchain) {

        if (nft.ca && blockchain.nfts.has(nft.ca)) {
            sender.updateNfts(nft.ca, false)
            recipient.updateNfts(nft.ca, true)
            blockchain.nfts.set(nft.ca, nft)
        } else {
            recipient.unmintedNfts.add(nft)
            // sender
            for (const [key, existingNFT] of sender.unmintedNfts.entries()) {
                if (
                    nft.creator === existingNFT.creator &&
                    nft.owner === existingNFT.owner &&
                    nft.name === existingNFT.name &&
                    nft.url === existingNFT.url &&
                    nft.description === existingNFT.description &&
                    nft.totalSupply === existingNFT.totalSupply &&
                    nft.position === existingNFT.position
                ) {
                    sender.unmintedNfts.delete(existingNFT)
                }
            }
        }

        nft.transfer(sender.address, recipient.address)
        return true;
    }

    static buyNFT(sender, recipient, nft, blockchain) {
        let traded = false;
        const seller = nft.seller;
        const price = nft.price;

        sender.updateCoins(-price)
        recipient.updateCoins(price)

        for (const account of blockchain.accounts.values()) {
            if (nft.ca && !traded) {
                for (const [key, n] of recipient.nfts.entries()) {
                    if (n.ca === nft.ca) {
                        n.buy(sender.address, seller, price)
                        sender.updateNfts(n.ca, n, true)
                        recipient.updateNfts(n.ca, false)
                        blockchain.n.set(n.ca, n) 
                        traded = true;
                    }
                } 
            } else if (!nft.ca) {
                // checking unminted nfts
                for (const [key, n] of recipient.unmintedNfts.entries()) {
                    if (
                        n.creator === nft.creator &&
                        n.owner === nft.owner &&
                        n.name === nft.name &&
                        n.url === nft.url &&
                        n.description === nft.description &&
                        n.totalSupply === nft.totalSupply &&
                        (n.position === nft.position || (n.position === undefined && nft.position === undefined))
                    ) {
                        n.buy(sender.address, seller, price)
                        sender.unmintedNfts.add(n)
                        recipient.unmintedNfts.delete(n)
                        blockchain.nfts.set(n.ca, n)
                        traded = true;
                    }
                }
            }
        }

        return true;
    }

    static listNFTForSale(sender, nft, blockchain) {
        const {seller, price} = nft

        if (nft.ca && blockchain.nfts.has(nft.ca)) {
            nft.listForSale(sender.address, price, seller)
        } else {
            for (const [key, existingNFT] of sender.unmintedNfts.entries()) {
                if (
                    nft.creator === existingNFT.creator &&
                    nft.owner === existingNFT.owner &&
                    nft.name === existingNFT.name &&
                    nft.url === existingNFT.url &&
                    nft.description === existingNFT.description &&
                    nft.totalSupply === existingNFT.totalSupply &&
                    nft.position === existingNFT.position
                ) {
                    existingNFT.listForSale(sender.address, price, seller)
                }
            }
        }

        return true;
    }

    // static upgradeNFT(transaction, stateDatabase) {
    //     const { data } = transaction;
    //     const nft = Blockchain.getNFT(data.nftId);
    //     nft.data = data.newNftData;
    //     Blockchain.updateNfts(nft);
    //     return nft;
    // }

    // static burnNFT(sender, nft, blockchain) {
    //     if (nft.ca && blockchain.nfts.has(nft.ca)) {
    //         sender.updateNfts(nft.ca, false)
    //         blockchain.nfts.delete(nft.ca)
    //     } else {
    //         for (const [key, existingNFT] of sender.unmintedNfts.entries()) {
    //             if (
    //                 nft.creator === existingNFT.creator &&
    //                 nft.owner === existingNFT.owner &&
    //                 nft.name === existingNFT.name &&
    //                 nft.url === existingNFT.url &&
    //                 nft.description === existingNFT.description &&
    //                 nft.totalSupply === existingNFT.totalSupply &&
    //                 nft.position === existingNFT.position
    //             ) {
    //                 sender.unmintedNfts.delete(existingNFT)
    //             }
    //         }
    //     }

    //     nft.burn(sender.address)
    // }

    // static lockNFT(transaction, stateDatabase) {
    //     const { data } = transaction;
    //     const nft = Blockchain.getNFT(data.nftId);
    //     nft.locked = true;
    //     Blockchain.updateNfts(nft);
    //     return nft;
    // }

    // static unlockNFT(transaction, stateDatabase) {
    //     const { data } = transaction;
    //     const nft = Blockchain.getNFT(data.nftId);
    //     nft.locked = false;
    //     Blockchain.updateNfts(nft);
    //     return nft;
    // }
}

module.exports = NFTExecution;
