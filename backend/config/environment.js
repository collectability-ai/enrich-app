// config/environment.js
const dotenv = require('dotenv');
const path = require('path');

function loadEnvironment() {
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const ENVIRONMENT = process.env.NODE_ENV || (isLambda ? "production" : "development");

    // Load `.env` file for local development
    if (!isLambda) {
        const envPath = path.resolve(process.cwd(), `.env.${ENVIRONMENT}`);
        dotenv.config({ path: envPath });
        console.log(`Loaded local ${ENVIRONMENT} environment`);
    } else {
        console.log('Running in Lambda environment (production assumed)');
    }

    return {
        isLambda,
        ENVIRONMENT,
    };
}

module.exports = loadEnvironment;
