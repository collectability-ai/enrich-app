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

// Import dotenv to load environment variables
const dotenv = require("dotenv");

// Determine if running in AWS Lambda
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Load environment variables dynamically for local development
if (!isLambda) {
  dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
  console.log(`Loaded environment variables from .env.${process.env.NODE_ENV || 'development'}`);
}

// Ensure NODE_ENV is correctly set
const ENVIRONMENT = process.env.NODE_ENV || (isLambda ? "production" : "development");

// Determine if running in production
const isProduction = ENVIRONMENT === "production";

// Validate critical environment variables
function validateEnvironmentVariables() {
  const requiredVars = [
    "AWS_REGION",
    "API_ENDPOINT",
    "COGNITO_CLIENT_ID",
    "COGNITO_USER_POOL_ID",
  ];

  // Add environment-specific variables
  requiredVars.push("ALLOWED_ORIGINS");
  requiredVars.push(isProduction ? "STRIPE_LIVE_SECRET_KEY" : "STRIPE_TEST_SECRET_KEY");

  if (!isLambda) {
    requiredVars.push("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY");
  }

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("Missing required environment variables:", missingVars);
    throw new Error("Environment configuration error: Missing variables.");
  }

  console.log("Environment variables validated successfully.");
}

// Validate environment variables before proceeding
validateEnvironmentVariables();

// Dynamically assign STRIPE_SECRET_KEY based on environment
const stripeSecretKey = isProduction
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

// Initialize Stripe client and validate
if (!stripeSecretKey) {
  console.error("Stripe secret key is missing. Check environment variables.");
  throw new Error("Stripe secret key is required for Stripe client initialization.");
}

const stripe = require("stripe")(stripeSecretKey);
console.log("Stripe client initialized successfully.");

// Parse allowed origins from environment variables or set default for development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ENVIRONMENT === "development"
  ? ["http://localhost:5000"]
  : [];

// Log environment and configuration state
console.log("Environment and Configuration State:", {
  isLambda,
  ENVIRONMENT,
  isProduction,
  ALLOWED_ORIGINS: allowedOrigins,
  API_ENDPOINT: process.env.API_ENDPOINT,
  STRIPE_SECRET_KEY_EXISTS: !!stripeSecretKey,
  AWS_REGION: process.env.AWS_REGION,
});

// Export key variables for use across the app
module.exports = {
  isLambda,
  ENVIRONMENT,
  isProduction,
  allowedOrigins,
  stripe,
  API_ENDPOINT: process.env.API_ENDPOINT,
};

// Execute validation and get AWS config
validateEnvironmentVariables();

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: isProduction
    ? fromEnv() // Use Lambda IAM role credentials
    : {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
};

// Log final configuration
console.log("AWS Configuration Loaded:");
console.log(`Region: ${awsConfig.region}`);
console.log(`Access Key ID exists: ${!!awsConfig.credentials.accessKeyId}`);
console.log(`Secret Access Key exists: ${!!awsConfig.credentials.secretAccessKey}`);
console.log(`Stripe initialized for ${isProduction ? "production" : "testing/development"} environment`);

// Export configuration
module.exports = {
  awsConfig,
  stripe,
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
  ...awsConfig,
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

// Middleware setup for CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:3000'];

      console.log('CORS Middleware Setup:');
      console.log('Allowed Origins:', allowedOrigins);
      console.log('Request Origin:', origin);

      if (!origin) {
        // Allow requests with no Origin header (e.g., server-to-server or cURL requests)
        console.log('No Origin header present. Allowing request.');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        // Allow requests from allowed origins
        return callback(null, true);
      } else {
        // Reject requests from disallowed origins
        console.error(`CORS request rejected from origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true, // Allow cookies or credentials
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(bodyParser.json());

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

async function updateUserCredits(email, credits) {
  if (!email) {
    logger.error("No email provided to updateUserCredits");
    throw new Error("Email is required");
  }

  const params = {
    TableName: USER_CREDITS_TABLE,
    Key: { email: email },
    UpdateExpression: "SET credits = :credits",
    ExpressionAttributeValues: { ":credits": credits },
    ReturnValues: "UPDATED_NEW"
  };

  try {
    logger.info(`Updating credits for user ${email} to ${credits}`);
    logger.info(`Using table: ${USER_CREDITS_TABLE}`); // Debug log
    const result = await dynamoDBDocClient.send(new UpdateCommand(params));
    logger.info(`Successfully updated credits for ${email}:`, result);
    return result;
  } catch (error) {
    logger.error("Error updating user credits:", {
      error: error.message,
      email: email,
      tableName: USER_CREDITS_TABLE,
      credits: credits
    });
    throw error;
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

// Export necessary items
module.exports = {
  app,
  express,
  logger,
  verifyToken,
  stripe,
  signer,
  getUserCredits,
  updateUserCredits,
  logSearchHistory,
  signUpUser,
  CREDIT_COSTS,
  dynamoDBDocClient,
  USER_CREDITS_TABLE,
  SEARCH_HISTORY_TABLE,
  cognitoClient,
  InitiateAuthCommand,
  Sha256,
  HttpRequest
};