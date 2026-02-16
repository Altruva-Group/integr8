const MINE_RATE = 1000 // 600000;
const INITIAL_DIFFICULTY = 3;

const STARTING_BALANCE = 100;
const MINING_REWARD = 10;

const BLOCKCHAIN_METADATA = {
    name: "INTEGR8",
    symbol: "ITG",
    logo: {
        png: "ITG",
        svg: "ITG"
    },
    description: ""
};

const GENESIS_DATA = {
    timestamp: 1726483691847,
    lastHash: "INTEGR8 GENESIS BLOCK LAST HASH",
    hash: "INTEGR8 GENESIS BLOCK HASH",
    difficulty: INITIAL_DIFFICULTY,
    nonce: 0,
    transactions: [],
    merkleTrie: "",
    merkleRoot: "0".repeat(64),
    gasFee: 0,
    metadata: BLOCKCHAIN_METADATA
};



const REWARD_INPUT = {address: "*ITG-authorized-reward*"};

module.exports = {
    MINE_RATE,
    INITIAL_DIFFICULTY,
    BLOCKCHAIN_METADATA,
    GENESIS_DATA,
    STARTING_BALANCE,
    MINING_REWARD,
    REWARD_INPUT
}