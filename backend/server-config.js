// Load environment variables
require("dotenv").config();

// Core dependencies
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_TEST_SECRET_KEY);
const winston = require("winston");
const cors = require("cors");

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
const port = 5000;
const region = "us-east-2";
const USER_CREDITS_TABLE = "EnV_UserCredits";
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
  jwksUri: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_EHz7xWNbm/.well-known/jwks.json",
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
async function getUserCredits(email) {
  if (!email) {
    console.log("No email provided to getUserCredits");
    return 0;
  }

  try {
    const result = await dynamoDBDocClient.send(new GetCommand({
      TableName: USER_CREDITS_TABLE,
      Key: { userEmail: email }
    }));
    return result.Item ? result.Item.credits : 0;
  } catch (error) {
    console.error("Error fetching user credits:", error);
    return 0;
  }
}

async function updateUserCredits(email, credits) {
  try {
    await dynamoDBDocClient.send(new UpdateCommand({
      TableName: USER_CREDITS_TABLE,
      Key: { userEmail: email },
      UpdateExpression: "SET credits = :credits",
      ExpressionAttributeValues: { ":credits": credits },
      ReturnValues: "UPDATED_NEW"
    }));
  } catch (error) {
    console.error("Error updating user credits:", error);
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
    ClientId: "64iqduh82e6tvd5orlkn7rktc8",
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
  port,
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
  SEARCH_HISTORY_TABLE,
  cognitoClient,
  InitiateAuthCommand,
  Sha256,
  HttpRequest
};