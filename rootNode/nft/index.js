const { randomUUID } = require("crypto");

class NFT {
    constructor({ca, creator, owner, name, url, description, isMinted, position=0, totalSupply=1, paused=false, frozen=false, locked=false}) {
        this.ca = ca || null;
        this.creator = creator;
        this.owner = owner;
        // this.pastOwner = new Set(); // keep record of past owners
        this.name = name;
        this.url = url;
        this.description = description;
        this.position = position;
        this.totalSupply = totalSupply;
        this.isMinted = isMinted || false;
        this.paused = paused; // trade
        this.frozen = frozen; // mint/burn
        this.locked = locked; // upgrade
        this.features = new Map();
        this.marketplace = new Map();
    }    
    
    generateCA() {
        return `0x${randomUUID().split("-").join("")}`;
        // return `0x755c62f93da247379bfb78ec86fbcb9f`;
    }
    
    generateSaleId() {
        return `0x${randomUUID().split("-").join("")}`;
        // return `0x755c62f93da247379bfb78ec86fbcb9f`;
    }

    toJSON() {
        return {
            ca: this.ca,
            owner: this.owner,
            creator: this.creator,
            name: this.name,
            url: this.url,
            description: this.description,
            position: this.position,
            totalSupply: this.totalSupply,            
            paused: this.paused,
            frozen: this.frozen,
            locked: this.locked,
            isMinted: this.isMinted,
            features: Array.from(this.features.entries()),
            marketplace: Array.from(this.marketplace.entries())
        }
    }

    static fromJSON(json) {
        const nft = new NFT({
            ca: json.ca,
            creator: json.creator,
            owner: json.owner,
            name: json.name,
            url: json.url,
            description: json.description,
            position: json.position,
            totalSupply: json.totalSupply,            
            paused: json.paused,
            frozen: json.frozen,
            locked: json.locked,
            isMinted: json.isMinted
        })

        nft.metadata = new Map(json.metadata)
        nft.features = new Map(json.features)

        return nft;
    }

    // mint
    mint(owner) {
        this._onlyAdmin(owner)

        if (this.isMinted) {
            throw new Error("This NFT is already minted!");
        }
        
        if (this.locked) throw new Error("This asset is locked. Locked assets can not be upgraded");
        if (this.frozen) throw new Error("This asset is frozen. Frozen assets can not be minted")

        // if (!name || !description) throw new Error("Please supply the asset details to mint");
              
        this.ca = this.generateCA();
        this.isMinted = true;

        return {
            ca: this.ca,
            name: this.name,
            url: this.url,
            description: this.description,
            owner: this.owner,
            creator: this.creator,
            position: this.position,
            totalSupply: this.totalSupply,
            minted: this.isMinted
        }
    }

    // Transfer
    transfer(from, to) {
        if (this.owner !== from) {
            throw new Error("Not the owner!");
        }
        if (this.paused) {
            throw new Error("Token is paused! Asset can not be traded");
        }

        this.owner = to;
    }

    // Burn
    burn(from) {
       this._onlyAdmin(from)

        if (this.locked) {
            throw new Error("Asset is locked. Can not be burned");
        }
        if (this.frozen) {
            throw new Error("Asset is frozen. Can not be burned");
        }

        this.features.delete(this.ca);
        this.marketplace.delete(this.ca);
        this.url = null;
        this.name = null;
        this.description = null;
        this.standard = null;
        this.paused = null;
        this.frozen = null;
        this.locked = null;
        this.ca = null;
    }

    // Lock
    lock() {
        this._onlyAdmin(from)

        if (this.locked) {
            throw new Error("Asset is already locked!");
        }

        this.locked = true;
    }

    // Unlock
    unlock() {
        this._onlyAdmin(from)

        if (!this.locked) {
            throw new Error("Asset is not locked!");
        }

        this.locked = false;
    }

    // freeze
    freeze() {
        this._onlyAdmin(from)

        if (this.frozen) {
            throw new Error("Asset is already frozen!");
        }

        this.frozen = true;
    }

    // unfreeze
    unfreeze() {
        this._onlyAdmin(from)

        if (!this.frozen) {
            throw new Error("Asset is not frozen!");
        }

        this.frozen = false;
    }

    // pause
    pause() {
        this._onlyAdmin(from)

        if (this.paused) {
            throw new Error("Asset is already paused!");
        }

        this.paused = true;
    }

    // Unpause
    unpause() {
        this._onlyAdmin(from)

        if (!this.paused) {
            throw new Error("Asset is not paused!");
        }

        this.paused = false;
    }

    // Edit/Upgrade NFT
    upgrade(owner, metadata = null, features = null) {
        this._onlyAdmin(owner)

        if (this.isMinted) throw new Error("This has been minted. Minted assets can not be upgraded");
        if (this.locked) throw new Error("This asset is locked. Locked assets can not be upgraded");

        if (metadata) {
            this.name = metadata.name;
            this.description = metadata.description
        }

        if (features) {
            for (const feature of features) {
                if (typeof feature !== "object") throw new Error("Invalid feature")
                this.features.set(feature[0], feature)
            }
        }
    }

    // List for Sale
    listForSale(owner, price, seller) {
        this._onlyAdmin(owner)

        if (this.paused) throw new Error("Asset is paused. Asset can not be traded");

        if (!price || !seller) {
            throw new Error("Price and seller details are required");
        }

        if (price && isNaN(price)) throw new Error("Invalid price supplied");

        if (seller && (!seller.name || !seller.url || !seller.owner)) throw new Error("Seller name, seller URL and asset owner are required");

        const nftSaleId = this.generateSaleId();

        seller.owner = owner;
        seller.nftSaleId = nftSaleId;

        this.marketplace.set("currency", "DVR");
        this.marketplace.set("price", price);
        this.marketplace.set("seller", seller);
    }

    // Buy
    buy(buyer, nftSeller, nftPrice) {     
        if (!this.marketplace.has("seller")) {
            throw new Error("Asset is not for sale!");
        }

        const seller = this.marketplace.get("seller");
        const price = this.marketplace.get("price");
        const {name, url, owner, nftSaleId} = seller;
        // console.log({seller, price})

        this._onlyAdmin(owner);


        // console.log(`asset owner ${this.owner} vs seller.owner ${owner} and nftSeller.owner ${nftSeller.owner}`)
        
        // seller: name, url, owner 
        if (name !== nftSeller.name || url !== nftSeller.url || owner !== nftSeller.owner || nftSaleId !== nftSeller.nftSaleId) throw new Error("Invalid NFT seller details")

        if (this.paused) throw new Error("Asset is paused. Asset can not be traded");

        if (price !== nftPrice) throw new Error("Invalid amount specified for the buy")

        this.transfer(owner, buyer); 
        this.marketplace = new Map();
        // console.log("marketplace aftersale:", this.marketplace)
    }

    _onlyCreatorOrOwner() {
        if (this.creator !== owner && this.owner !== owner) {
            throw new Error("Only the creator or current owner can mint this NFT.");
        }
    }

    _onlyAdmin(owner) {
        if (this.owner !== owner) throw new Error("Wallet is not the owner of this asset");
    }

    // owner
    ownerOf() {
        return this.owner;
    }

    // creator
    creatorOf() {
        return this.creator;
    }

    // metadata, do i need this?
    nftURI() {
        return {
            ca: this.ca,
            owner: this.owner,
            creator: this.creator,
            name: this.name,
            url: this.url,
            description: this.description,
            standard: this.standard,
            paused: this.paused,
            frozen: this.frozen,
            locked: this.locked,
            features: Array.from(this.features.entries()),
            marketplace: Array.from(this.marketplace.entries())
        };
    }
}

module.exports = NFT;
