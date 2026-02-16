const MerkleTrie = require('../trie');
const crypto = require('crypto');

describe('MerkleTrie', () => {
  let trie;

  beforeEach(() => {
    trie = new MerkleTrie();
  });

  describe('basic operations', () => {
    test('should insert and retrieve a value', () => {
      const key = crypto.randomBytes(32).toString('hex');
      const value = { data: 'test data' };
      
      trie.insert(key, value);
      const retrieved = trie.get(key);
      
      expect(retrieved).toEqual(value);
    });

    test('should return null for non-existent key', () => {
      const key = crypto.randomBytes(32).toString('hex');
      const retrieved = trie.get(key);
      
      expect(retrieved).toBeNull();
    });

    test('should handle multiple inserts to same key', () => {
      const key = crypto.randomBytes(32).toString('hex');
      const value1 = { data: 'first value' };
      const value2 = { data: 'second value' };
      
      trie.insert(key, value1);
      trie.insert(key, value2);
      
      const retrieved = trie.get(key);
      expect(retrieved).toEqual(value2);
    });
  });

  describe('merkle properties', () => {
    test('root hash should change when value changes', () => {
      const key = crypto.randomBytes(32).toString('hex');
      const value1 = { data: 'test1' };
      const value2 = { data: 'test2' };
      
      trie.insert(key, value1);
      const hash1 = trie.root.hash;
      
      trie.insert(key, value2);
      const hash2 = trie.root.hash;
      
      expect(hash1).not.toBe(hash2);
    });

    test('different data should produce different root hashes', () => {
      const trie1 = new MerkleTrie();
      const trie2 = new MerkleTrie();
      
      const key1 = crypto.randomBytes(32).toString('hex');
      const key2 = crypto.randomBytes(32).toString('hex');
      const value = { data: 'test' };
      
      trie1.insert(key1, value);
      trie2.insert(key2, value);
      
      expect(trie1.root.hash).not.toBe(trie2.root.hash);
    });

    test('identical data should produce identical root hashes', () => {
      const trie1 = new MerkleTrie();
      const trie2 = new MerkleTrie();
      
      const key = crypto.randomBytes(32).toString('hex');
      const value = { data: 'test' };
      
      trie1.insert(key, value);
      trie2.insert(key, value);
      
      expect(trie1.root.hash).toBe(trie2.root.hash);
    });
  });

  describe('serialization', () => {
    test('should serialize and maintain structure', () => {
      const key = crypto.randomBytes(32).toString('hex');
      const value = { data: 'test data' };
      
      trie.insert(key, value);
      const serialized = trie.toJSON();
      
      expect(serialized).toHaveProperty('root');
      expect(serialized.root).toHaveProperty('hash');
      expect(typeof serialized.root.hash).toBe('string');
    });
  });
});