let instances = {
    blockchain: null,
    transactionPool: null,
    stateDatabase: null,
    transactionMiner: null,
    pubsub: null
};

const setInstances = ({ blockchainInstance, transactionPoolInstance, stateDatabaseInstance }) => {
    instances.blockchain = blockchainInstance;
    instances.transactionPool = transactionPoolInstance;
    instances.stateDatabase = stateDatabaseInstance;
};

const setPubSub = (pubsubInstance) => {
    instances.pubsub = pubsubInstance;
};

const setTransactionMiner = (transactionMinerInstance) => {
    instances.transactionMiner = transactionMinerInstance;
};

const getInstances = () => instances;

module.exports = {
    setInstances,
    setPubSub,
    setTransactionMiner,
    getInstances,
};
