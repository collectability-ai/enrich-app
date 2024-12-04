require("dotenv").config(); // Load environment variables at the very top

const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_TEST_SECRET_KEY);
const winston = require("winston");
const cors = require("cors");

// AWS SDK v3 imports
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
  ScanCommand, // For fetching search history
} = require("@aws-sdk/lib-dynamodb");
const { SignatureV4 } = require("@aws-sdk/signature-v4"); // Import SignatureV4
const { fromEnv } = require("@aws-sdk/credential-providers"); // Use fromEnv for credentials
const { Sha256 } = require("@aws-crypto/sha256-js"); // Import Sha256
const { HttpRequest } = require("@aws-sdk/protocol-http");

// Other dependencies
const axios = require("axios");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// API and Configuration
const API_KEY = process.env.ENRICH_VALIDATE_API_KEY;

// Configure DynamoDB Client
const dynamoDBClient = new DynamoDBClient({ region: "us-east-2" });
const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Table Names
const USER_CREDITS_TABLE = "EnV_UserCredits";
const SEARCH_HISTORY_TABLE = "EnV_SearchHistory";

// AWS Region
const region = "us-east-2";

// Initialize SignatureV4 signer for API requests
const signer = new SignatureV4({
  service: "execute-api",
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Log to verify configuration
console.log("AWS clients and SignatureV4 configured successfully.");

// Define credit costs for each operation type
const CREDIT_COSTS = {
  validate: 2,
  enrich: 2,
  validate_and_enrich: 3,
};

// Configure JWKS client for Cognito
const client = jwksClient({
  jwksUri: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_EHz7xWNbm/.well-known/jwks.json",
});

// Middleware to validate tokens
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract Bearer token

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  };

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded; // Add decoded user info to request
    next();
  });
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

// Route: Secure Endpoint (Example for Token Validation)
app.post("/secure-endpoint", verifyToken, (req, res) => {
  res.json({ message: "Secure access granted", user: req.user });
});

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
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: "never", // Explicitly disallow redirect-based payment methods
  },
});

    // Fetch current credits and update them with the purchased credits
    const currentCredits = await getUserCredits(email);

    if (currentCredits === null) {
      logger.error(`No existing credits found for user: ${email}`);
      throw new Error("User not found in credits database.");
    }

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
    logger.error(`Error purchasing credits for ${email}: ${err.message}`, {
      stack: err.stack,
    });
    res.status(400).send({ error: { message: err.message } });
  }
});


// Route: Create Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Accepts card payments
      line_items: [
        {
          price: "price_1QOv9IAUGHTClvwyzELdaAiQ", // 50-credit pack price ID
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment
      success_url: "http://localhost:3000/dashboard?status=success", // Adjust for production
      cancel_url: "http://localhost:3000/dashboard?status=cancel", // Adjust for production
    });

    res.json({ url: session.url }); // Respond with Stripe Checkout Session URL
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).send({ error: "Failed to create checkout session" });
  }
});

// Route: Get Payment Methods
app.post("/get-payment-methods", verifyToken, async (req, res) => {
    try {
        // Extract user email from the token
        const email = req.user?.email;

        if (!email) {
            return res.status(401).send({ error: "Unauthorized access" });
        }

        // Fetch or create the customer in Stripe
        const customers = await stripe.customers.list({ email });
        const customer = customers.data.find((c) => c.email === email);

        if (!customer) {
            return res.status(404).send({ error: "Customer not found" });
        }

        // Fetch payment methods
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: "card",
        });

        // Simplify the response
        const simplifiedMethods = paymentMethods.data.map((method) => ({
            id: method.id,
            brand: method.card.brand,
            last4: method.card.last4,
            exp_month: method.card.exp_month,
            exp_year: method.card.exp_year,
        }));

        // Handle case when no payment methods are found
        if (simplifiedMethods.length === 0) {
            return res
                .status(200)
                .send({ paymentMethods: [], message: "No payment methods found" });
        }

        res.status(200).send({ paymentMethods: simplifiedMethods });
    } catch (error) {
        console.error("Error fetching payment methods:", error.message);
        res.status(500).send({ error: "Failed to fetch payment methods" });
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

// Use a Search Route
app.post("/use-search", async (req, res) => {
  const { email, searchQuery } = req.body;
  const requestID = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info("POST /use-search hit with body:", { email, searchQuery, requestID });

    // Step 1: Validate request payload
    if (!email || !searchQuery) {
      const errorMessage = "Invalid request payload: Missing email or search query.";
      logger.error(errorMessage, { body: req.body, requestID });
      return res.status(400).send({ error: { message: errorMessage } });
    }

    // Step 2: Fetch user credits
    const credits = await getUserCredits(email);
    if (credits <= 0) {
      const errorMessage = "No remaining credits. Please purchase a new pack.";
      logger.error(errorMessage, { email, requestID });
      await logSearchHistory(email, searchQuery, requestID, errorMessage);
      return res.status(403).send({ error: { message: errorMessage, purchaseRequired: true } });
    }

    // Step 3: Determine credit cost
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
        error: { message: errorMessage, requiredCredits: creditCost, remainingCredits: credits },
      });
    }

    // Step 4: Prepare payload for API request
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
      emailAddresses: [searchQuery.email || ""],
      phoneNumbers: [searchQuery.phone || ""],
    };

    logger.info("Payload prepared for external API:", { payload, requestID });

    // Step 5: Prepare and sign the API request
    const request = new HttpRequest({
      hostname: "8zb4x5d8q4.execute-api.us-east-2.amazonaws.com",
      path: "/SandBox/enrichandvalidatev2",
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        Host: "8zb4x5d8q4.execute-api.us-east-2.amazonaws.com",
        "x-api-key": process.env.API_KEY, // Include the API key
      },
    });

    // Initialize the SignatureV4 signer with the SHA-256 hash constructor
    const signer = new SignatureV4({
      service: "execute-api",
      region: "us-east-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      sha256: Sha256, // Explicit SHA-256 hash implementation
    });

    const signedRequest = await signer.sign(request);

    // Log signed request headers for debugging
    logger.info("Signed request headers:", {
      headers: signedRequest.headers,
    });

    // Step 6: Make the signed API call
    let apiResponse;
    try {
      logger.info("Sending signed request to external API...");
      const response = await axios({
        method: signedRequest.method,
        url: `https://${signedRequest.hostname}${signedRequest.path}`,
        headers: signedRequest.headers,
        data: signedRequest.body,
      });

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

    // Step 7: Deduct user credits
    await updateUserCredits(email, credits - creditCost);

    // Step 8: Log search history
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

    // Step 9: Send success response to client
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

// Route: Get Purchase History
app.post("/get-purchase-history", async (req, res) => {
    const { email } = req.body;

    try {
        // Find the Stripe customer by email
        const customers = await stripe.customers.list({ email });
        const customer = customers.data.find((c) => c.email === email);

        if (!customer) {
            return res.status(404).send({ error: "Customer not found" });
        }

        // Fetch payment intents (purchase history)
        const paymentIntents = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 10, // Fetch up to 10 most recent purchases
        });

        // Simplify the response
        const history = paymentIntents.data.map((payment) => ({
            amount: payment.amount / 100, // Convert to dollars
            currency: payment.currency.toUpperCase(),
            status: payment.status,
            date: new Date(payment.created * 1000).toLocaleString(), // Convert to readable date
            description: payment.description || "Credit Purchase",
        }));

        res.status(200).send({ history });
    } catch (error) {
        console.error("Error fetching purchase history:", error.message);
        res.status(500).send({ error: "Failed to fetch purchase history" });
    }
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});