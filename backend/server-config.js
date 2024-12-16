// Load environment variables first
require("dotenv").config();

// Verify Stripe key is loaded
const stripeKey = process.env.NODE_ENV === "production"
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

if (!stripeKey) {
  throw new Error('Stripe API key is missing. Please check your environment variables.');
}

// Core dependencies
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const stripe = require("stripe")(stripeKey);
const winston = require("winston");
const cors = require("cors");

// Debug log to verify environment
console.log("Environment:", process.env.NODE_ENV || 'development');

// AWS SDK imports
const { CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { fromEnv } = require("@aws-sdk/credential-providers");
const { Sha256 } = require("@aws-crypto/sha256-js");
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { SignUpCommand, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Other dependencies
const axios = require("axios");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Initialize Express app
const app = express();

// Constants
const region = process.env.AWS_REGION || "us-east-2";
console.log("Using AWS Region:", region); // Temporary log for verification
const USER_CREDITS_TABLE = "EnV_UserCredits"; // Make sure this matches exactly
const SEARCH_HISTORY_TABLE = "EnV_SearchHistory";
const CREDIT_COSTS = {
  validate: 2,
  enrich: 2,
  validate_and_enrich: 3,
};

// Configure AWS Clients
const dynamoDBClient = new DynamoDBClient({ region });
const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);
const cognitoClient = new CognitoIdentityProviderClient({ region });

// Initialize SignatureV4 signer
const signer = new SignatureV4({
  service: "execute-api",
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  sha256: Sha256,
});

// Configure JWKS client
const client = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
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

// Middleware setup
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(cookieParser());
app.use(bodyParser.json());

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
// In server-config.js, update these functions:

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