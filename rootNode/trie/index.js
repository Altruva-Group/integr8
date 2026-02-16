const MerkleTrieNode = require('./trieNode');

class MerkleTrie {
    constructor() {
        this.root = new MerkleTrieNode();
    }

    insert(key, value) {
        let currentNode = this.root;
        key = Buffer.from(key, 'hex');
    
        const serializedValue = JSON.stringify(value);
    
        // console.log(`Inserting key: ${key.toString('hex')}, value: ${serializedValue}`);
        
        for (const byte of key) {
            let childNode = currentNode.getChild(byte);
    
            if (!childNode) {
                childNode = new MerkleTrieNode(currentNode);
                currentNode.setChild(byte, childNode);
            }
    
            currentNode = childNode;
        }
    
        currentNode.setValue(serializedValue);
        this.root.updateHash();
        // console.log(`Root Hash after insertion: ${this.root.hash}`);
    }
    

    get(key) {
        let currentNode = this.root;
        key = Buffer.from(key, 'hex');

        for (const byte of key) {
            currentNode = currentNode.getChild(byte);
            if (!currentNode) return null;
        }

        return currentNode.value ? JSON.parse(currentNode.value) : null;
    }

    toJSON() {
        return {
            root: this.root.toJSON()
        };
    }
}

module.exports = MerkleTrie;
