// Import required modules (Remove duplicates)
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
require("dotenv").config();

// Load environment variables dynamically based on NODE_ENV
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

// Determine the environment dynamically
const isProduction = process.env.NODE_ENV === "production";

// Dynamically assign environment-specific variables
process.env.FRONTEND_URL = isProduction
  ? process.env.FRONTEND_URL
  : process.env.FRONTEND_URL || "http://localhost:3000";

process.env.API_ENDPOINT = isProduction
  ? process.env.API_ENDPOINT
  : process.env.API_ENDPOINT;

process.env.STRIPE_SECRET_KEY = isProduction
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

// Debugging log
console.log("Environment Configuration:");
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Environment: ${isProduction ? "production" : "testing/development"}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`API_ENDPOINT: ${process.env.API_ENDPOINT}`);
console.log(`Stripe Key Exists: ${!!process.env.STRIPE_SECRET_KEY}`);

// Validate critical environment variables
function validateEnvironmentVariables() {
  const requiredVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "FRONTEND_URL",
    "API_ENDPOINT",
    "STRIPE_SECRET_KEY",
    "COGNITO_CLIENT_ID",
    "COGNITO_USER_POOL_ID",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("Missing required environment variables:", missingVars);
    throw new Error("Environment configuration error: Missing variables.");
  }

  console.log("Environment variables validated successfully.");
}

// Execute validation and get AWS config
validateEnvironmentVariables();

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

// Initialize Stripe with environment-specific key
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

// Environment and Constants
const ENVIRONMENT = process.env.NODE_ENV || "development";
console.log(`Running in Environment: ${ENVIRONMENT}`);

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

// Configure AWS Clients
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Debugging Logs
console.log("AWS Configuration:");
console.log(`Region: ${process.env.AWS_REGION}`);
console.log(`Access Key ID exists: ${!!process.env.AWS_ACCESS_KEY_ID}`);
console.log(`Secret Access Key exists: ${!!process.env.AWS_SECRET_ACCESS_KEY}`);

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

// Middleware setup
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = {
      production: process.env.FRONTEND_URL,
      testing: process.env.FRONTEND_URL,
      development: process.env.FRONTEND_URL || "http://localhost:3000",
    };

    const currentEnvironment = process.env.NODE_ENV || "development";
    const allowedOrigin = allowedOrigins[currentEnvironment];

    console.log("CORS Origin Check:", {
      environment: currentEnvironment,
      requestOrigin: origin,
      allowedOrigin: allowedOrigin,
    });

    // Allow requests with no origin (e.g., mobile apps or cURL requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if the request origin matches the allowed origin for the current environment
    if (origin === allowedOrigin) {
      callback(null, true);
    } else {
      console.error(`CORS request rejected from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

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