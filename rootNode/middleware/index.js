const express = require('express');
const logger = require('../utils/logger');
const { ValidationError, StateError, NetworkError, ConsensusError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Error occurred:', {
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code,
            data: err.data
        },
        request: {
            method: req.method,
            url: req.url,
            body: req.body,
            params: req.params,
            query: req.query
        }
    });

    // Handle known errors
    if (err instanceof ValidationError) {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            data: err.data
        });
    }

    if (err instanceof StateError) {
        return res.status(409).json({
            error: 'State Error',
            message: err.message,
            data: err.data
        });
    }

    if (err instanceof NetworkError) {
        return res.status(503).json({
            error: 'Network Error',
            message: err.message,
            data: err.data
        });
    }

    if (err instanceof ConsensusError) {
        return res.status(500).json({
            error: 'Consensus Error',
            message: err.message,
            data: err.data
        });
    }

    // Handle unknown errors
    return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred'
            : err.message
    });
}

// Request logging middleware
function requestLogger(req, res, next) {
    const start = Date.now();

    // Log when the request completes
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration,
            userAgent: req.get('user-agent')
        });
    });

    next();
}

// Health check middleware
function healthCheck(req, res) {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
    });
}

module.exports = {
    errorHandler,
    requestLogger,
    healthCheck
};