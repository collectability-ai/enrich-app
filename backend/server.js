require("dotenv").config(); // Load environment variables at the very top

const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_TEST_SECRET_KEY);
const winston = require("winston");
const cors = require("cors");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Configure DynamoDB Client
const dynamoDBClient = new DynamoDBClient({ region: "us-east-2" });
const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Table Names
const USER_CREDITS_TABLE = "EnV_UserCredits";
const SEARCH_HISTORY_TABLE = "EnV_SearchHistory";

// Utility Functions
async function getUserCredits(email) {
  const params = {
    TableName: USER_CREDITS_TABLE,
    Key: { email },
  };

  try {
    const result = await dynamoDBDocClient.send(new GetCommand(params));
    return result.Item ? result.Item.credits : 0; // Default to 0 if no record exists
  } catch (error) {
    console.error("Error fetching user credits:", error);
    throw error;
  }
}

async function updateUserCredits(email, credits) {
  const params = {
    TableName: USER_CREDITS_TABLE,
    Key: { email },
    UpdateExpression: "SET credits = :credits",
    ExpressionAttributeValues: { ":credits": credits },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDBDocClient.send(new UpdateCommand(params));
  } catch (error) {
    console.error("Error updating user credits:", error);
    throw error;
  }
}

async function logSearchHistory(email, searchQuery, apiResponse) {
  const params = {
    TableName: SEARCH_HISTORY_TABLE,
    Item: {
      email,
      timestamp: Date.now(),
      searchQuery,
      apiResponse,
    },
  };

  try {
    await dynamoDBDocClient.send(new PutCommand(params));
  } catch (error) {
    console.error("Error logging search history:", error);
    throw error;
  }
}

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

// Initialize Express app
const app = express();
const port = 5000;

// Add CORS Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow your frontend's origin
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Add JSON parsing middleware
app.use(bodyParser.json());

// Log server initialization
logger.info("Server initialized.");

// Route: Purchase Pack
app.post("/purchase-pack", async (req, res) => {
  const { email, priceId, paymentMethodId } = req.body;

  try {
    // Find or create customer
    const customers = await stripe.customers.list({ email });
    let customer = customers.data.find((c) => c.email === email);

    if (!customer) {
      customer = await stripe.customers.create({ email });
    }

    // Check for existing default payment method
    let paymentMethod = paymentMethodId || customer.invoice_settings.default_payment_method;

    if (!paymentMethod) {
      return res.status(400).send({
        error: { message: "No default payment method on file. Please add one." },
      });
    }

    // Determine the amount and credits based on priceId
    const packOptions = {
      "price_1QNgCzAUGHTClvwyfnBxMXtF": { amount: 500, credits: 5 },
      "price_1QNgCzAUGHTClvwyl3xyl6K2": { amount: 2500, credits: 25 },
      "price_1QNgCzAUGHTClvwySgfbcXGk": { amount: 10000, credits: 100 },
      "price_1QNgCzAUGHTClvwy34bnpfSC": { amount: 22500, credits: 500 },
    };

    const pack = packOptions[priceId];

    if (!pack) {
      return res.status(400).send({ error: { message: "Invalid price ID" } });
    }

    // Create a PaymentIntent with the existing payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.amount,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethod,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never", // Explicitly disable redirect-based methods
      },
    });

    // Add credits to the user in DynamoDB
    const currentCredits = await getUserCredits(email);
    await updateUserCredits(email, currentCredits + pack.credits);

    logger.info(`Credits updated for ${email}: ${currentCredits + pack.credits}`);
    res.status(200).send({
      message: "Pack purchased successfully.",
      remainingCredits: currentCredits + pack.credits,
    });
  } catch (err) {
    logger.error(`Error purchasing pack for ${email}: ${err.message}`);
    res.status(400).send({ error: { message: err.message } });
  }
});

// Route: Check or Fetch Credits
app.post("/check-credits", async (req, res) => {
  const { email } = req.body;

  try {
    const credits = await getUserCredits(email);
    res.status(200).send({ email, credits });
  } catch (err) {
    console.error("Error checking credits:", err.message);
    res.status(500).send({ error: { message: "Internal server error" } });
  }
});

// Route: Use a Search
app.post("/use-search", async (req, res) => {
  const { email, searchQuery, apiResponse } = req.body;

  try {
    const credits = await getUserCredits(email);

    if (credits <= 0) {
      return res.status(403).send({
        error: {
          message: "No remaining credits. Please purchase a new pack.",
          purchaseRequired: true,
        },
      });
    }

    await updateUserCredits(email, credits - 1);
    await logSearchHistory(email, searchQuery, apiResponse);

    res.status(200).send({
      message: "Search recorded successfully.",
      remainingCredits: credits - 1,
    });
  } catch (err) {
    console.error("Error during search:", err.message);
    res.status(500).send({ error: { message: "Internal server error" } });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
