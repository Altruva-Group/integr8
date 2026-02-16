const MerkleTrieNode = require("./trieNode");

class MerkleTrie {
    constructor() {
        this.root = new MerkleTrieNode();
    }

    insert(key, value) {
        key = Buffer.from(key, 'hex'); // assuming key is a hex string
        let currentNode = this.root;
    
        for (const char of key) {
            let childNode = currentNode.getChild(char);
    
            if (!childNode) {
                childNode = new MerkleTrieNode();
                currentNode.setChild(char, childNode);
            }
    
            currentNode = childNode;
        }
    
        currentNode.setValue(value);
    
        // Update hashes from the leaf node up to the root
        let node = currentNode;
        while (node !== this.root) {
            node.updateHash();
            node = node.parent;
        }
    
        this.root.updateHash();
    }

    get(key) {
        let currentNode = this.root;

        for (const char of key) {
            currentNode = currentNode.getChild(char)

            if (!currentNode) {
                return null;
            }
        }

        return currentNode.value
    }

    toJSON() {
        return {
            root: this.root.toJSON()
        };
    }
}

module.exports = MerkleTrie;