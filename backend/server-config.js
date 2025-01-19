// Import required modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const winston = require('winston');
const { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { fromEnv } = require('@aws-sdk/credential-providers');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const awsServerlessExpress = require('aws-serverless-express');
const dotenv = require('dotenv');

// =========================================
// Environment Configuration
// =========================================

// Determine runtime environment
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Load environment variables
if (!isLambda) {
  dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
  console.log(`Loaded environment variables from .env.${process.env.NODE_ENV || 'development'}`);
} else {
  console.log('Running in Lambda environment - using provided environment variables');
  process.env.NODE_ENV = 'production';
}

const ENVIRONMENT = process.env.NODE_ENV || (isLambda ? "production" : "development");
const isProduction = ENVIRONMENT === "production";

// =========================================
// URL and CORS Configuration
// =========================================

// Frontend URL determination
const getFrontendUrl = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'https://app.contactvalidate.com';
    case 'testing':
      return 'https://testing.contactvalidate.com';
    default:
      return 'http://localhost:3000';
  }
};

const FRONTEND_URL = process.env.FRONTEND_URL || getFrontendUrl();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : isProduction 
    ? ['https://app.contactvalidate.com', 'https://testing.contactvalidate.com']
    : ['http://localhost:3000'];

// Validate CORS configuration
if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS is not configured properly in the environment.');
}

// =========================================
// Environment Validation
// =========================================

function validateEnvironmentVariables() {
  const requiredVars = [
    "AWS_REGION",
    "API_ENDPOINT",
    "COGNITO_CLIENT_ID",
    "COGNITO_USER_POOL_ID",
    "ALLOWED_ORIGINS"
  ];

  requiredVars.push(isProduction ? "STRIPE_LIVE_SECRET_KEY" : "STRIPE_TEST_SECRET_KEY");

  if (!isProduction) {
    if (!process.env.API_ACCESS_KEY_ID || !process.env.API_SECRET_ACCESS_KEY) {
      console.warn(
        "Warning: External API credentials (API_ACCESS_KEY_ID and API_SECRET_ACCESS_KEY) are missing in development."
      );
    }
  }

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("Missing required environment variables:", missingVars);
    throw new Error("Environment configuration error: Missing variables.");
  }

  console.log("Environment variables validated successfully.");
}

validateEnvironmentVariables();

// =========================================
// External API Configuration
// =========================================

const externalApiCredentials = {
  accessKeyId: process.env.API_ACCESS_KEY_ID,
  secretAccessKey: process.env.API_SECRET_ACCESS_KEY,
};

// =========================================
// AWS Configuration
// =========================================

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: isLambda ? fromEnv() : undefined,
};

// =========================================
// Stripe Configuration
// =========================================

const stripeSecretKey = isProduction
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Stripe secret key is required for initialization.");
}

const stripe = require("stripe")(stripeSecretKey);

const stripePriceIDs = {
  prod_basic3: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_BASIC_3
    : process.env.STRIPE_LIVE_PRICE_ID_BASIC_3,
  prod_basic10: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_BASIC_10
    : process.env.STRIPE_LIVE_PRICE_ID_BASIC_10,
  prod_basic50: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_BASIC_50
    : process.env.STRIPE_LIVE_PRICE_ID_BASIC_50,
  prod_popular150: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_POPULAR_150
    : process.env.STRIPE_LIVE_PRICE_ID_POPULAR_150,
  prod_premium500: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_PREMIUM_500
    : process.env.STRIPE_LIVE_PRICE_ID_PREMIUM_500,
  prod_premium1000: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_PREMIUM_1000
    : process.env.STRIPE_LIVE_PRICE_ID_PREMIUM_1000,
  prod_premium1750: process.env.NODE_ENV === 'development'
    ? process.env.STRIPE_TEST_PRICE_ID_PREMIUM_1750
    : process.env.STRIPE_LIVE_PRICE_ID_PREMIUM_1750,
};

// =========================================
// Debug Logging
// =========================================

console.log('Configuration Summary:', {
  Environment: {
    NODE_ENV: process.env.NODE_ENV,
    isLambda,
    isProduction,
  },
  URLs: {
    FRONTEND_URL,
    allowedOrigins,
  },
  AWS: {
    region: awsConfig.region,
    hasCredentials: !!awsConfig.credentials,
  },
  Stripe: {
    initialized: !!stripe,
    environment: isProduction ? "production" : "testing/development",
    hasPriceIDs: Object.keys(stripePriceIDs).length
  }
});

// Export configuration and key variables for use across the app
module.exports = {
  isLambda,
  ENVIRONMENT,
  isProduction,
  allowedOrigins,
  stripe,
  API_ENDPOINT: process.env.API_ENDPOINT,
  awsConfig,
  stripePriceIDs, // Add stripePriceIDs to the exports
};

// Initialize Express app
const app = express();

// Dynamic Table and API Configuration
const USER_CREDITS_TABLE = "EnV_UserCredits"; // Single table for all environments
const SEARCH_HISTORY_TABLE = "EnV_SearchHistory"; // Single table for all environments
const CREDIT_COSTS = {
  validate: 2,
  enrich: 2,
  validate_and_enrich: 3,
};

console.log(`Using User Credits Table: ${USER_CREDITS_TABLE}`);
console.log(`Using Search History Table: ${SEARCH_HISTORY_TABLE}`);

// Initialize DynamoDB and Cognito Clients
const dynamoDBClient = new DynamoDBClient(awsConfig);
const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);
const cognitoClient = new CognitoIdentityProviderClient(awsConfig);

// Debugging Logs for AWS Clients
console.log("AWS Clients initialized:");
console.log(`- DynamoDB: ${!!dynamoDBClient}`);
console.log(`- DynamoDB Document Client: ${!!dynamoDBDocClient}`);
console.log(`- Cognito Client: ${!!cognitoClient}`);

// Initialize SignatureV4 signer
const signer = new SignatureV4({
  service: "execute-api",
  region: process.env.AWS_REGION,
  credentials: externalApiCredentials, // Use custom credentials for external API
  sha256: Sha256,
});

// Configure JWKS client
const client = jwksClient({
  jwksUri: `https://cognito-idp.${awsConfig.region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
});

// Initialize Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "backend.log" }),
  ],
});

// Debug log the frontend URL being used
console.log("Frontend URL Configuration:", {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL
});

// CORS middleware configuration
app.use(cors({
  origin: (origin, callback) => {
    // Log CORS request details
    logger.info('CORS Request Details:', {
      requestOrigin: origin,
      allowedOrigins: allowedOrigins,
      environment: process.env.NODE_ENV
    });

    // Handle requests with no origin (e.g., same-origin, server-to-server)
    if (!origin) {
      logger.info('Same-origin or server-to-server request allowed');
      return callback(null, true);
    }

    // Check if origin is allowed
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
      logger.info(`CORS request allowed from origin: ${origin}`);
      return callback(null, true);
    }

    // Handle rejected origins
    const errorMsg = `CORS request rejected: ${origin} is not an allowed origin`;
    logger.warn(errorMsg, {
      rejectedOrigin: origin,
      allowedOrigins: allowedOrigins
    });
    return callback(new Error(errorMsg));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Origin',
    'Accept'
  ],
  maxAge: 86400, // CORS preflight cache duration: 24 hours
  exposedHeaders: ['Content-Length', 'X-Request-Id'], // Headers the client can read
}));

// Error handler for CORS preflight failures
app.use((err, req, res, next) => {
  if (err.message.includes('CORS')) {
    logger.error('CORS Error:', {
      error: err.message,
      origin: req.headers.origin,
      path: req.path
    });
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }
  next(err);
});

// Enhanced security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});

// Body parser configuration
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    // Raw body parser for Stripe webhook
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    // JSON parser for all other routes
    express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'frontend', 'build'); // Updated path
    logger.info(`Attempting to serve static files from: ${buildPath}`);
    try {
        const fs = require('fs');
        if (fs.existsSync(buildPath)) {
            app.use(express.static(buildPath));
            logger.info('Successfully configured static file serving');
        } else {
            logger.error(`Build directory not found at: ${buildPath}`);
        }
    } catch (error) {
        logger.error('Error setting up static file serving:', error);
    }
}

// Token validation middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      callback(null, key.getPublicKey());
    });
  };

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// Utility Functions
async function getUserCredits(email) {
  if (!email) {
    logger.error("No email provided to getUserCredits");
    return 0;
  }

  const params = {
    TableName: USER_CREDITS_TABLE,
    Key: { email: email }
  };

  try {
    logger.info(`Fetching credits for user: ${email}`);
    const result = await dynamoDBDocClient.send(new GetCommand(params));
    logger.info(`Credits result for ${email}:`, result);  // Add this for debugging
    return result.Item ? result.Item.credits : 0;
  } catch (error) {
    logger.error("Error fetching user credits:", {
      error: error.message,
      email: email,
      tableName: USER_CREDITS_TABLE
    });
    throw error;
  }
}

async function updateUserCreditsWithRetry(email, credits, maxRetries = 3) {
  if (!email) {
    logger.error("No email provided to updateUserCredits");
    throw new Error("Email is required");
  }

  let retries = 0;
  while (retries < maxRetries) {
    try {
      logger.info(`Attempt ${retries + 1}: Updating credits for user ${email} to ${credits}`);
      
      const params = {
        TableName: USER_CREDITS_TABLE,
        Key: { email },
        UpdateExpression: "SET credits = :credits",
        ExpressionAttributeValues: { ":credits": credits },
        ReturnValues: "UPDATED_NEW"
      };

      logger.info(`Using table: ${USER_CREDITS_TABLE}`);
      const result = await dynamoDBDocClient.send(new UpdateCommand(params));
      logger.info(`Successfully updated credits for ${email}:`, result);
      return result;
    } catch (error) {
      logger.error(`Attempt ${retries + 1} failed:`, {
        error: error.message,
        email: email,
        tableName: USER_CREDITS_TABLE,
        credits: credits
      });

      retries++;
      if (retries === maxRetries) {
        throw new Error('Failed to update credits after multiple attempts');
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
}

async function logSearchHistory(email, searchQuery, requestID, status, rawResponse = null, EnVrequestID = null) {
  const now = new Date();
  const utc7Date = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  const timestamp = utc7Date.toISOString();

  try {
    await dynamoDBDocClient.send(new PutCommand({
      TableName: SEARCH_HISTORY_TABLE,
      Item: {
        requestID,       // Partition key
        timestamp,       // Sort key
        email,          // Keep as 'email' to match existing schema
        EnVrequestID: EnVrequestID || "N/A",
        searchQuery,
        status,
        rawResponse: rawResponse ? JSON.stringify(rawResponse) : "N/A"
      }
    }));
    logger.info("Search history logged successfully", { requestID });
  } catch (error) {
    logger.error("Error logging search history:", {
      errorMessage: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function signUpUser(userData) {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID, // Environment variable
    Username: userData.email,
    Password: userData.password,
    UserAttributes: [
      { Name: "email", Value: userData.email },
      { Name: "phone_number", Value: userData.phone },
      { Name: "name", Value: userData.name },
      { Name: "custom:companyName", Value: userData.companyName },
      { Name: "custom:companyWebsite", Value: userData.companyWebsite },
      { Name: "custom:companyEIN", Value: userData.companyEIN || "" },
      { Name: "custom:useCase", Value: userData.useCase },
    ],
  };

  try {
    return await cognitoClient.send(new SignUpCommand(params));
  } catch (err) {
    console.error("Error signing up user:", err);
    throw err;
  }
}

// Initialize User Credits Function
async function initializeUserCredits(email) {
  try {
    const params = {
      TableName: USER_CREDITS_TABLE,
      Item: {
        email,
        credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(email)',
    };

    await dynamoDBDocClient.send(new PutCommand(params));
    logger.info(`Initialized new user: ${email}`);
    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      logger.info(`User ${email} already exists`);
      return true;
    }
    logger.error('Error initializing user credits:', error);
    return false;
  }
}

// Verify Credits Update Function
async function verifyCreditsUpdate(email, expectedCredits, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const currentCredits = await getUserCredits(email);
    if (currentCredits === expectedCredits) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  return false;
}

// Validate Purchase Request Function
async function validatePurchaseRequest(email, priceId, paymentMethodId) {
  if (!email || !priceId || !paymentMethodId) {
    throw new Error('Missing required fields');
  }

  // Verify user exists
  const userCredits = await getUserCredits(email);
  if (userCredits === null) {
    await initializeUserCredits(email);
  }

  // Credit tiers definition
  const creditTiers = {
    prod_basic3: { amount: 200, credits: 3 },
    prod_basic10: { amount: 597, credits: 10 },
    prod_basic50: { amount: 1997, credits: 50 },
    prod_popular150: { amount: 4997, credits: 150 },
    prod_premium500: { amount: 11997, credits: 500 },
    prod_premium1000: { amount: 19997, credits: 1000 },
    prod_premium1750: { amount: 27997, credits: 1750 }
  };

  if (!creditTiers[priceId] || !stripePriceIDs[priceId]) {
    throw new Error('Invalid product ID');
  }

  return creditTiers[priceId];
}


module.exports = {
  // Core modules
  app,
  express,
  awsConfig,
  logger,

  // Authentication & Payment
  verifyToken,
  stripe,
  stripePriceIDs,
  signer,

  // Utility functions
  getUserCredits,
  updateUserCreditsWithRetry,
  logSearchHistory,
  signUpUser,
  validateEnvironmentVariables,
  initializeUserCredits,
  verifyCreditsUpdate,
  validatePurchaseRequest,
  getFrontendUrl,

  // Constants & Tables
  CREDIT_COSTS,
  USER_CREDITS_TABLE,
  SEARCH_HISTORY_TABLE,

  // AWS Services & Commands
  dynamoDBDocClient,
  cognitoClient,
  InitiateAuthCommand,
  Sha256,
  HttpRequest,

  // Environment & Configuration
  isLambda,
  ENVIRONMENT,
  isProduction,
  allowedOrigins,
  FRONTEND_URL,
  API_ENDPOINT: process.env.API_ENDPOINT
};