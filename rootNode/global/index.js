const dotenv = require('dotenv');

dotenv.config();


const isDevelopment = process.env.ENV === 'development';
 // || process.env.ENV === 'dev' || process.env.ENV === 'local' || process.env.ENV === 'test' || process.env.ENV === 'testing' || process.env.ENV === 'staging' || process.env.ENV === 'staging-dev' || process.env.ENV === 'staging-test' || process.env.ENV === 'staging-local' || process.env.ENV === 'staging-testing' || process.env.ENV === 'staging-staging' || process.env.ENV === 'staging-staging-dev' || process.env.ENV === 'staging-staging-test' || process.env.ENV === 'staging-staging-local' || process.env.ENV === 'staging-staging-testing';

const DEFAULT_PORT = 10000;


module.exports = {
    isDevelopment,
    DEFAULT_PORT
}