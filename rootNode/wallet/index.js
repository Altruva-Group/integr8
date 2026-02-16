const { v4: uuidv4 } = require('uuid');
const bip39 = require('bip39');
require('dotenv').config();
const {ec} = require("../hash");

class Wallet {
    constructor() {
        this.id = uuidv4();
        this.mnemonic = bip39.generateMnemonic();
        const seed = bip39.mnemonicToSeedSync(this.mnemonic);

        this.keyPair = ec.keyFromPrivate(seed.subarray(0, 32).toString('hex'));
        this.privateKey = this.keyPair.getPrivate('hex');
        this.publicKey = this.keyPair.getPublic('hex');
    }

    sign(data) {
        return this.keyPair.sign(data).toDER('hex');
    }
}

module.exports = Wallet;
