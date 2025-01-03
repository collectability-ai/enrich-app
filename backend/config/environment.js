// config/environment.js
const dotenv = require('dotenv');
const path = require('path');

function loadEnvironment() {
    // In Lambda, use production credentials
    // For local development, use .env.development
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (!isLambda) {
        // Load local development environment
        const envPath = path.resolve(process.cwd(), '.env.development');
        dotenv.config({ path: envPath });
        console.log('Loading local development environment');

        return {
            API_BASE_URL: 'http://localhost:8080/api',
            FRONTEND_URL: 'http://localhost:3000'
        };
    }

    // In Lambda, use production environment variables
    console.log('Loading production environment in Lambda');
    
    return {
        API_BASE_URL: 'https://app.contactvalidate.com/api',
        FRONTEND_URL: 'https://app.contactvalidate.com',
        // Other production-specific settings
    };
}

// Wrapper for Lambda handler
function withProductionConfig(handler) {
    return async (event, context) => {
        // Load appropriate environment
        const config = loadEnvironment();
        
        // Set essential environment variables
        Object.entries(config).forEach(([key, value]) => {
            process.env[key] = value;
        });

        console.log('Environment loaded:', {
            isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
            apiBaseUrl: process.env.API_BASE_URL,
            frontendUrl: process.env.FRONTEND_URL
        });

        try {
            return await handler(event, context);
        } catch (error) {
            console.error('Lambda execution error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Internal Server Error' })
            };
        }
    };
}

module.exports = { withProductionConfig, loadEnvironment };