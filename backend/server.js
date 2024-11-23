require("dotenv").config(); // Load environment variables at the very top

const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_TEST_SECRET_KEY);
const winston = require("winston");
const cors = require("cors");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require("axios"); // For backend (Node.js)

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

async function logSearchHistory(email, searchQuery, requestID, status, rawResponse = null) {
  const params = {
    TableName: "EnV_SearchHistory",
    Item: {
      requestID, // Partition key: Unique ID for the search
      email, // User email
      timestamp: new Date().toISOString(), // ISO formatted timestamp
      searchQuery, // Input query submitted by the user
      status, // "Success" or an error message
      rawResponse: rawResponse ? JSON.stringify(rawResponse) : "N/A", // Full raw response excluding requestID from the API response
    },
  };

  try {
    await dynamoDBDocClient.send(new PutCommand(params));
    console.log("Search history logged successfully:", params.Item);
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
    origin: "http://localhost:3000",
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
    const customers = await stripe.customers.list({ email });
    let customer = customers.data.find((c) => c.email === email);

    if (!customer) {
      customer = await stripe.customers.create({ email });
    }

    let paymentMethod = paymentMethodId || customer.invoice_settings.default_payment_method;

    if (!paymentMethod) {
      return res.status(400).send({
        error: { message: "No default payment method on file. Please add one." },
      });
    }

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.amount,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethod,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });

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
  const { email, searchQuery } = req.body;

  try {
    // Step 1: Validate user credits
    const credits = await getUserCredits(email);
    if (credits <= 0) {
      const errorMessage = "No remaining credits. Please purchase a new pack.";
      await logSearchHistory(email, searchQuery, "N/A", errorMessage);
      return res.status(403).send({
        error: {
          message: errorMessage,
          purchaseRequired: true,
        },
      });
    }

    // Step 2: Construct payload for Enrich and Validate API
    const payload = {
      FirstName: searchQuery.firstName,
      LastName: searchQuery.lastName,
      Email: searchQuery.email,
      Phone: searchQuery.phone,
      Address: {
        addressLine1: searchQuery.addressLine1,
        city: searchQuery.city,
        state: searchQuery.state,
        zip: searchQuery.zip,
      },
    };

    console.log("Payload sent to Enrich and Validate API:", payload);

    // Step 3: Call the Enrich and Validate API
    const lambdaResponse = await axios.post(
      "https://8zb4x5d8q4.execute-api.us-east-2.amazonaws.com/SandBox/enrichandvalidate",
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const enrichData = lambdaResponse.data;
    console.log("API Response from Enrich and Validate:", enrichData);

    // Step 4: Validate API response
    if (!enrichData || !enrichData.requestID) {
      const errorMessage = "Failed to get valid data from Enrich and Validate API.";
      await logSearchHistory(email, searchQuery, "N/A", errorMessage);
      return res.status(500).send({ error: { message: errorMessage } });
    }

    // Step 5: Deduct one credit
    await updateUserCredits(email, credits - 1);

    // Step 6: Log search history with corrected partition key
    const dynamoDBRequestID = enrichData.requestID; // Use the API requestID as the partition key

    await logSearchHistory(
      email,
      searchQuery,
      dynamoDBRequestID, // Ensure the correct requestID from the API is used as the partition key
      "Success",
      {
        ...enrichData,
        requestID: undefined, // Exclude the requestID field from raw response to avoid duplication
      }
    );

    // Step 7: Return success response
    res.status(200).send({
      message: "Search successful.",
      remainingCredits: credits - 1,
      data: enrichData,
    });
  } catch (error) {
    // Step 8: Handle errors gracefully
    console.error("Error during search:", error.message);
    await logSearchHistory(
      email,
      searchQuery,
      "N/A",
      error.message || "Internal Server Error"
    );
    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
