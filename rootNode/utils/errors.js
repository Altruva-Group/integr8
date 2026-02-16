class BlockchainError extends Error {
    constructor(message, code, data = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.data = data;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends BlockchainError {
    constructor(message, data = {}) {
        super(message, 'VALIDATION_ERROR', data);
    }
}

class StateError extends BlockchainError {
    constructor(message, data = {}) {
        super(message, 'STATE_ERROR', data);
    }
}

class NetworkError extends BlockchainError {
    constructor(message, data = {}) {
        super(message, 'NETWORK_ERROR', data);
    }
}

class ConsensusError extends BlockchainError {
    constructor(message, data = {}) {
        super(message, 'CONSENSUS_ERROR', data);
    }
}

module.exports = {
    BlockchainError,
    ValidationError,
    StateError,
    NetworkError,
    ConsensusError
};