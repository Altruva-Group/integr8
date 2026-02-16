const crypto = require('crypto');

class MerkleTrieNode {
    constructor(parent = null) {
        this.children = new Map();
        this.value = null;
        this.parent = parent;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const hash = crypto.createHash('sha256');

        // sort children entries by key for consistent hashing
        const sortedChidren = Array.from(this.children.entries()).sort((a, b) => a[0] - b[0]);
        // Serialize the keys and children hashes
        let childrenHash = sortedChidren.map(([key, child]) => key + child.hash).join('');

        // let childrenHash = '';
        // for (const [key, child] of this.children.entries()) {
        //     childrenHash += key + child.hash;
        // }

        // Serialize the value
        const valueHash = this.value ||  '';

        hash.update(childrenHash + valueHash);
        return hash.digest('hex');
    }
    

    setChild(key, childNode) {
        this.children.set(key, childNode);
        childNode.parent = this;
        this.updateHash();
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
        this.updateHash();
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

    // debugPrint(level = 0) {
    //     console.log('  '.repeat(level) + `Key: ${this.key || 'ROOT'}, Hash: ${this.hash}, Value: ${this.value || ''}`);
    //     for (const [key, child] of this.children.entries()) {
    //         child.debugPrint(level + 1);
    //     }
    // }
}

module.exports = MerkleTrieNode;
