const crypto = require("crypto")

class MerkleTrieNode {
    constructor(parent = null) {
        this.children = new Map();
        this.value = null;
        this.parent = parent;
        this.hash = this.calculateHash();
    }

    calculateHash(){
        const hash = crypto.createHash('sha256');
    
        hash.update(JSON.stringify([...this.children.entries()]) + JSON.stringify(this.value || ''));
    
        return hash.digest('hex');
    }

setChild(key, childNode) {
    this.children.set(key, childNode);
    childNode.parent = this;
    this.hash = this.calculateHash();
    if (this.parent) {
        this.parent.updateHash();
    }
}

updateHash() {
    this.hash = this.calculateHash();
    if (this.parent) {
        this.parent.updateHash();
    }
}

    getChild(key) {
        return this.children.get(key);
    }

    setValue(value) {
        this.value = value;
        this.hash = this.calculateHash();
    }

    toJSON() {
        return {
            children: [...this.children.entries()].reduce((acc, [key, node]) => {
                acc[key] = node.toJSON();
                return acc;
            }, {}),
            value: this.value,
            hash: this.hash
        };
    }
}

module.exports = MerkleTrieNode;