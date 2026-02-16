const { TOKEN_CREATION_FEE, NFT_CREATION_FEE } = require("../../fees");
const { verifySignature } = require("../../hash");
const deepCopy = require("../../utils/deepCopy");
const nftExistsGlobally = require("../../utils/nftExistsGlobally");

class NFTValidator {
    static validate(transaction, stateDatabase, blockchain) {
        const { type, action, from, to, amount, nft, signature } = transaction;
        const sender = stateDatabase.getAccount(from);
        const recipient = stateDatabase.getAccount(to);

        // sender
        let senderNFTs = deepCopy(sender.nfts);
        // recipient
        const recipientNFTs = deepCopy(recipient.nfts);
        // let recipientNft = recipientNFTs?.get(nft.ca) || null;

        if (!nft) throw new Error("Invalid asset.");
        if (!sender) throw new Error("Invalid owner account");
            // No fee-related balance check
        if (typeof amount !== "number" || amount <= 0) throw new Error("Invalid amount specified.")

        switch (action) {
            case 'create':
                this.validateCreateNFT(type, amount, action, sender, nft, blockchain, signature);
                break;
            case 'mint':
                this.validateMintNFT(type, amount, action, sender, nft, blockchain, signature);
                break;
            case 'transfer':
                this.validateTransferNFT(type, amount, action, sender, recipient, nft, blockchain, signature);
                break;
            // case 'upgrade':
            //     this.validateUpgradeNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            // case 'burn':
            //     this.validateBurnNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            case 'buy':
                this.validateBuyNFT(type, amount, action, sender, recipient, nft, blockchain, signature);
                break;
            case 'list-for-sale':
                this.validateListNFTForSale(type, amount, action, sender, nft, blockchain, signature);
                break;
            // case 'lock':
            //     this.validateLockNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            // case 'unlock':
            //     this.validateUnlockNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            // case 'freeze':
            //     this.validateFreezeNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            // case 'unfreeze':
            //     this.validateUnfreezeNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            // case 'pause':
            //     this.validatePauseNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            // case 'unpause':
            //     this.validateUnpauseNFT(type, amount, action, sender, nft, blockchain, signature);
            //     break;
            default:
                throw new Error(`Unknown NFT action: ${action}`);
        }
    }

    static validateCreateNFT(type, amount, action, sender, nft, blockchain, signature) {
        // console.log(sender.nfts.entries());

        if ((sender.coins - NFT_CREATION_FEE) < 0.0009) throw new Error("Invalid balance for transaction")
    
        if (nft.length > 1 || amount > 1) {
            for (const n of nft) {
                // Validate NFT structure
                if (!n.creator || !n.owner || !n.name || !n.url || !n.description || !n.totalSupply || !n.position) {
                    throw new Error("Invalid NFT asset.");
                }
    
                // Check if NFT already exists globally
                if (nftExistsGlobally(blockchain, n)) {
                    throw new Error("This NFT has already been created.");
                }
    
                // // redundant
                // // Check if the user has already created this NFT
                // for (const [key, existingNFT] of sender.nfts.entries()) {
                //     if (
                //         n.name === existingNFT.name &&
                //         n.url === existingNFT.url &&
                //         n.description === existingNFT.description
                //     ) {
                //         throw new Error("You already created this asset.");
                //     }
                // }
            }
        } else {
            // Validate single NFT
            if (!nft.creator || !nft.owner || !nft.name || !nft.url || !nft.description) {
                throw new Error("Invalid NFT asset.");
            }
    
            // Check if NFT already exists globally
            if (nftExistsGlobally(blockchain, nft)) {
                throw new Error("This NFT has already been created.");
            }
    
            // redundant
            // Check if the user has already created this NFT
            for (const [key, n] of sender.nfts.entries()) {
                if (
                    n.creator === nft.creator &&
                    n.owner === nft.owner &&
                    n.name === nft.name &&
                    n.url === nft.url &&
                    n.description === nft.description &&
                    n.totalSupply === nft.totalSupply &&
                    n.position === nft.position
                ) {
                    throw new Error("You already created this asset.");
                }
            }
        }
    
        // // Verify the signature
        const verify = verifySignature({ publicKey: sender.address, data: { wallet: sender.address, nft, amount, type, action }, signature });
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
    
        return true;
    }
    
    static validateMintNFT(type, amount, action, sender, nft, blockchain, signature) {
        // console.log({nft})
        if (amount > 1) {
            for (const n of nft) {
                if (n.frozen) throw new Error("One or more of this assets can not be minted");
                if (n.owner !== sender.address) throw new Error("Only the owner of these assets can mint them");
                if (n.isMinted) throw new Error("One or more of this assets have been minted.");
                if (!nftExistsGlobally(blockchain, n)) {
                    throw new Error("One or more of these assets do not exist.");
                }
            }
        } else {
            if (nft.frozen) throw new Error("This asset can not be minted");
            if (nft.owner !== sender.address) throw new Error("Only the owner of this asset can mint it");
            if (nft.isMinted) throw new Error("This asset has already been minted.");
            if (!nftExistsGlobally(blockchain, nft)) {
                throw new Error("This NFT does not exist.");
            }
        }

        const verify = verifySignature({ publicKey: sender.address, data: { wallet: sender.address, nft, amount, type, action }, signature });
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);

        return true;
    }

    static validateTransferNFT(type, amount, action, sender, recipient, nft, blockchain, signature) {
        if (nft.paused) throw new Error("This asset can not be traded");
        if (nft.owner !== sender.address) throw new Error("Only the owner of this asset can trade it");
        if (sender.address === recipient.address) throw new Error("Not allow to send to same wallet");
        // if (nft.isMinted) throw new Error("This asset has already been minted.");
        if (!nftExistsGlobally(blockchain, nft)) {
            throw new Error("This NFT does not exist.");
        }

        if (!recipient) throw new Error('Recipient address is required');

        const verify = verifySignature({ publicKey: sender.address, data: { wallet: sender.address, recipient: recipient.address, nft, amount, type, action }, signature });
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        return true;
    }

    static validateBuyNFT(type, amount, action, sender, recipient, nft, blockchain, signature) {
        const seller = nft.seller;
        const marketSeller = nft.marketplace.get("seller")
        // console.log("marketSeller:", marketSeller)

        if (!marketSeller) throw new Error("Asset not listed for sale")
            
        // const marketValue = nft.marketplace.get()
        // console.log("get 1 free")
        // console.log({type, amount, action, sender, recipient, nft, blockchain, signature})
        if (nft.paused) throw new Error("This asset can not be traded");
        if (nft.owner !== seller.owner) throw new Error("Only the owner of this asset can trade it");
        if (sender.address === recipient.address) throw new Error("Not allow to send to same wallet");
        // if (nft.isMinted) throw new Error("This asset has already been minted.");
        if (!nftExistsGlobally(blockchain, nft)) {
            throw new Error("This NFT does not exist.");
        }

        if (!recipient) throw new Error('Recipient address is required');

        if (sender.coins <= nft.marketplace.get("price")) {
            throw new Error('Insufficient balance for transaction');
        }

        if (!seller || !seller.name || !seller.url || !seller.nftSaleId || !seller.owner) {
            throw new Error("A valid seller details is required")
        }

        if (seller.name !== marketSeller.name || seller.url !== marketSeller.url || seller.nftSaleId !== marketSeller.nftSaleId) throw new Error("Invalid seller details")

            // { data: { wallet, recipient: recipient.address, nft, amount, type, action: "buy" }, privateKey }
        const verify = verifySignature({ publicKey: sender.address, data: { wallet: sender.address, recipient: recipient.address, nft, amount, type, action }, signature });
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        return true;
    }

    static validateListNFTForSale(type, amount, action, sender, nft, blockchain, signature) {
        const seller = nft.seller;
        const price = nft.price
        
        if (nft.marketplace.has("seller")) throw new Error("Asset is already listed for sale")
            
        // const marketValue = nft.marketplace.get()
        // console.log("get 1 free")
        // console.log({type, amount, action, sender, recipient, nft, blockchain, signature})
        if (nft.locked) throw new Error("This asset can not be traded");
        if (nft.owner !== sender.address) throw new Error("Only the owner of this asset can trade it");
        if (!nftExistsGlobally(blockchain, nft)) {
            throw new Error("This NFT does not exist.");
        }

        if (!seller || !seller.name || !seller.url || !seller.owner) {
            throw new Error("A valid seller details is required")
        }

        const verify = verifySignature({ publicKey: sender.address, data: { wallet: sender.address, nft, amount, price, seller, type, action }, signature });
        if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);
        return true;
    }

    // static validateUpgradeNFT(transaction) {
    //     const { sender, data } = transaction;
    //     const nft = Blockchain.getNFT(data.nftId);
    //     if (!nft) throw new Error('NFT not found');
    //     if (nft.owner !== sender) throw new Error('Only the owner can upgrade this NFT');
    //     return true;
    // }

    // static validateBurnNFT(type, amount, action, sender, nft, blockchain, signature) {

    //     if (nft.frozen) throw new Error("This asset can not be burned");
    //     if (nft.owner !== sender.address) throw new Error("Only the owner of this asset can burn it");

    //     if (!nftExistsGlobally(blockchain, nft)) {
    //         throw new Error("This NFT does not exist.");
    //     }

    //     const verify = verifySignature({ publicKey: sender.address, data: { wallet: sender.address, nft, amount, type, action }, signature });
    //     if (!verify) throw new Error(`Invalid transaction from ${sender.address}`);

    //     return true;
    // }

    // static validateLockNFT(transaction) {
    //     const { sender, data } = transaction;
    //     const nft = Blockchain.getNFT(data.nftId);
    //     if (!nft) throw new Error('NFT not found');
    //     if (nft.owner !== sender) throw new Error('Only the owner can lock this NFT');
    //     return true;
    // }

    // static validateUnlockNFT(transaction) {
    //     const { sender, data } = transaction;
    //     const nft = Blockchain.getNFT(data.nftId);
    //     if (!nft) throw new Error('NFT not found');
    //     if (nft.owner !== sender) throw new Error('Only the owner can unlock this NFT');
    //     return true;
    // }
}

module.exports = NFTValidator;
