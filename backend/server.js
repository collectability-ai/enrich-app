require("dotenv").config(); // Load environment variables at the very top

const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_TEST_SECRET_KEY);
const winston = require("winston");
const cors = require("cors");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
  QueryCommand,
  ScanCommand, // Added for fetching search history
} = require("@aws-sdk/lib-dynamodb");
const axios = require("axios"); // For backend (Node.js)


// Configure DynamoDB Client
const dynamoDBClient = new DynamoDBClient({ region: "us-east-2" });
const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Table Names
const USER_CREDITS_TABLE = "EnV_UserCredits";
const SEARCH_HISTORY_TABLE = "EnV_SearchHistory";

// Define credit costs for each operation type
const CREDIT_COSTS = {
  validate: 2,
  enrich: 2,
  validate_and_enrich: 3,
};

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

async function logSearchHistory(email, searchQuery, requestID, status, rawResponse = null, EnVrequestID = null) {
  const now = new Date();
  const utc7Date = new Date(now.getTime() - 7 * 60 * 60 * 1000); // Adjust for UTC-7
  const timestamp = utc7Date.toISOString();

  const params = {
    TableName: SEARCH_HISTORY_TABLE, // This points to "EnV_SearchHistory"
    Item: {
      requestID, // Use the app-generated ID
      EnVrequestID: EnVrequestID || "N/A", // Ensure this field explicitly logs the EnVrequestID
      email, // User email
      timestamp, // Adjusted UTC-7 timestamp
      searchQuery, // Input query submitted by the user
      status, // Status of the request ("Success" or failure message)
      rawResponse: rawResponse ? JSON.stringify(rawResponse) : "N/A", // Log full raw API response
    },
  };

  try {
    logger.info("Attempting to log search history in DynamoDB:", params.Item);

    // Perform the DynamoDB operation
    await dynamoDBDocClient.send(new PutCommand(params));

    logger.info("Search history logged successfully:", params.Item);
  } catch (error) {
    logger.error("Error logging search history:", {
      errorMessage: error.message,
      params: params.Item,
      stack: error.stack,
    });
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
    // Fetch or create the customer in Stripe
    const customers = await stripe.customers.list({ email });
    let customer = customers.data.find((c) => c.email === email);

    if (!customer) {
      customer = await stripe.customers.create({ email });
    }

    // Ensure a valid payment method is available
    let paymentMethod = paymentMethodId || customer.invoice_settings.default_payment_method;

    if (!paymentMethod) {
      return res.status(400).send({
        error: { message: "No default payment method on file. Please add one." },
      });
    }

    // Define the credit tiers and their Stripe price IDs
    const creditTiers = {
      "price_1QOv9IAUGHTClvwyRj2ChIb3": { amount: 597, credits: 10 },
      "price_1QOv9IAUGHTClvwyzELdaAiQ": { amount: 1997, credits: 50 },
      "price_1QOv9IAUGHTClvwyxw7vJURF": { amount: 4997, credits: 150 },
      "price_1QOv9IAUGHTClvwyMRquKtpG": { amount: 11997, credits: 500 },
      "price_1QOv9IAUGHTClvwyBH9Jh7ir": { amount: 19997, credits: 1000 },
      "price_1QOv9IAUGHTClvwykbXsElbr": { amount: 27997, credits: 1750 },
      "price_1QOubIAUGHTClvwyCb4r0ffE": { amount: 200, credits: 3 }, // Single validate_and_enrich
    };

    // Get the corresponding tier from the priceId
    const selectedTier = creditTiers[priceId];

    if (!selectedTier) {
      return res.status(400).send({ error: { message: "Invalid price ID" } });
    }

    // Create the payment intent in Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedTier.amount,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethod,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });

    // Fetch current credits and update them with the purchased credits
    const currentCredits = await getUserCredits(email);
    const updatedCredits = currentCredits + selectedTier.credits;
    await updateUserCredits(email, updatedCredits);

    // Log the successful credit update
    logger.info(`Credits updated for ${email}: ${updatedCredits}`);

    // Send the success response
    res.status(200).send({
      message: "Credits purchased successfully.",
      remainingCredits: updatedCredits,
    });
  } catch (err) {
    // Handle errors gracefully
    logger.error(`Error purchasing credits for ${email}: ${err.message}`);
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

// Route: Add Credits
app.post("/add-credits", async (req, res) => {
  const { email, creditsToAdd } = req.body;

  try {
    // Validate request
    if (!email || !creditsToAdd || creditsToAdd <= 0) {
      return res.status(400).send({ error: { message: "Invalid email or credits to add." } });
    }

    // Fetch current credits
    const currentCredits = await getUserCredits(email);

    // Update credits
    const newCredits = currentCredits + creditsToAdd;
    await updateUserCredits(email, newCredits);

    // Respond with the updated credit count
    res.status(200).send({
      message: `${creditsToAdd} credits added successfully.`,
      remainingCredits: newCredits,
    });

    logger.info(`Added ${creditsToAdd} credits to user: ${email}. New total: ${newCredits}`);
  } catch (error) {
    logger.error("Error in /add-credits:", error.message);
    res.status(500).send({ error: { message: "Internal server error while adding credits." } });
  }
});

// Route: Use Credit
app.post("/use-credit", async (req, res) => {
  const { email } = req.body;

  try {
    // Validate request
    if (!email) {
      return res.status(400).send({ error: { message: "Email is required." } });
    }

    // Fetch current credits
    const currentCredits = await getUserCredits(email);
    if (currentCredits <= 0) {
      return res.status(403).send({ error: { message: "No credits available to use." } });
    }

    // Deduct one credit
    const newCredits = currentCredits - 1;
    await updateUserCredits(email, newCredits);

    // Respond with the updated credit count
    res.status(200).send({
      message: "Credit used successfully.",
      remainingCredits: newCredits,
    });

    logger.info(`Deducted 1 credit from user: ${email}. Remaining credits: ${newCredits}`);
  } catch (error) {
    logger.error("Error in /use-credit:", error.message);
    res.status(500).send({ error: { message: "Internal server error while using credit." } });
  }
});

// Route: Reset Credits
app.post("/reset-credits", async (req, res) => {
  const { email } = req.body;

  try {
    // Validate the request payload
    if (!email) {
      return res.status(400).send({ error: { message: "Email is required." } });
    }

    // Fetch current credits for debugging purposes
    const currentCredits = await getUserCredits(email);
    logger.info(`Resetting credits for user: ${email}. Current credits: ${currentCredits}`);

    // Reset credits to 0
    await updateUserCredits(email, 0);

    // Respond with success message
    res.status(200).send({
      message: "Credits reset successfully.",
      remainingCredits: 0,
    });

    logger.info(`Credits reset to 0 for user: ${email}`);
  } catch (error) {
    // Log and handle any errors
    logger.error("Error in /reset-credits:", error.message);
    res.status(500).send({ error: { message: "Internal server error while resetting credits." } });
  }
});

// Route: Use a Search
app.post("/use-search", async (req, res) => {
  const { email, searchQuery } = req.body;

  // Initialize the requestID immediately
  const requestID = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info("POST /use-search hit with body:", { email, searchQuery, requestID });

    // Step 1: Validate request payload presence
    if (!email || !searchQuery) {
      const errorMessage = "Invalid request payload: Missing email or search query.";
      logger.error(errorMessage, { body: req.body, requestID });
      return res.status(400).send({ error: { message: errorMessage } });
    }

    // Step 2: Get user credits
    logger.info("Fetching credits for user:", email);
    const credits = await getUserCredits(email);
    if (credits <= 0) {
      const errorMessage = "No remaining credits. Please purchase a new pack.";
      logger.error(errorMessage, { email, requestID });
      await logSearchHistory(email, searchQuery, requestID, errorMessage);
      return res.status(403).send({
        error: {
          message: errorMessage,
          purchaseRequired: true,
        },
      });
    }

    // Step 3: Determine credit cost for the operation
    const operation = searchQuery.operation || "validate_and_enrich";
    const creditCost = CREDIT_COSTS[operation];

    if (!creditCost) {
      const errorMessage = `Unknown operation type: ${operation}`;
      logger.error(errorMessage, { email, requestID });
      return res.status(400).send({ error: { message: errorMessage } });
    }

    if (credits < creditCost) {
      const errorMessage = "Insufficient credits for this operation.";
      logger.error(errorMessage, { email, requestID });
      await logSearchHistory(email, searchQuery, requestID, errorMessage);
      return res.status(403).send({
        error: {
          message: errorMessage,
          requiredCredits: creditCost,
          remainingCredits: credits,
        },
      });
    }

    // Step 4: Prepare payload for external API
    const payload = {
      operation,
      nameAddresses: [
        {
          fullName: `${searchQuery.firstName} ${searchQuery.lastName}`,
          address: {
            line1: searchQuery.addressLine1 || "",
            city: searchQuery.city || "",
            region: searchQuery.state || "",
            postalCode: searchQuery.zip || "",
            countryCode: "US",
          },
        },
      ],
      emailAddresses: [searchQuery.email || ""], // Ensure an array with at least an empty string
      phoneNumbers: [searchQuery.phone || ""],  // Ensure an array with at least an empty string
    };

    logger.info("Payload prepared for external API:", { payload, requestID });

    // Step 5: Call external API
    let apiResponse;
    try {
      logger.info("Sending request to external API...");
      const response = await axios.post(
        "https://8zb4x5d8q4.execute-api.us-east-2.amazonaws.com/SandBox/enrichandvalidatev2",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      apiResponse = response.data;
      logger.info("Response received from external API:", { apiResponse, requestID });
    } catch (apiError) {
      logger.error("Error calling external API:", {
        apiResponse: apiError.response?.data || null,
        errorMessage: apiError.message,
        requestID,
      });
      const errorMessage = "Failed to get valid data from the API.";
      await logSearchHistory(email, searchQuery, requestID, errorMessage);
      return res.status(500).send({ error: { message: errorMessage } });
    }

    // Step 6: Deduct credits and log search history
    logger.info("Deducting credits for user:", { email, requestID });
    await updateUserCredits(email, credits - creditCost);

    try {
      await logSearchHistory(
        email,
        searchQuery,
        requestID,
        "Success",
        apiResponse,
        apiResponse.EnVrequestID
      );
      logger.info("Search history logged successfully for requestID:", {
        requestID,
        EnVrequestID: apiResponse.EnVrequestID,
      });
    } catch (logError) {
      logger.error("Failed to log search history after API success:", {
        errorMessage: logError.message,
        stack: logError.stack,
        requestID,
      });
    }

    // Step 7: Send response to client
    logger.info("Search completed successfully for user:", { email, requestID });
    res.status(200).send({
      message: "Search successful.",
      remainingCredits: credits - creditCost,
      data: apiResponse,
    });
  } catch (error) {
    logger.error("Unexpected error during /use-search:", {
      message: error.message,
      stack: error.stack,
      requestID,
    });

    try {
      await logSearchHistory(email, searchQuery, requestID, error.message || "Internal Server Error");
    } catch (logError) {
      logger.error("Failed to log search history during error handling:", {
        errorMessage: logError.message,
        requestID,
      });
    }

    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
});

// Route: Get Search History
app.post("/get-search-history", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ error: { message: "Email is required" } });
  }

  const params = {
    TableName: SEARCH_HISTORY_TABLE,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
    },
  };

  try {
    const data = await dynamoDBDocClient.send(new ScanCommand(params));
    res.status(200).send({ history: data.Items || [] });
  } catch (error) {
    console.error("Error fetching search history:", error);
    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});