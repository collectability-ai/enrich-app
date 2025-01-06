// Load dependencies and configuration
const {
  app,
  express,
  stripe,
  logger,
  verifyToken,
  dynamoDBDocClient,
  CREDIT_COSTS,
  USER_CREDITS_TABLE,
  SEARCH_HISTORY_TABLE,
  allowedOrigins,
} = require("./server-config");

const awsServerlessExpress = require('aws-serverless-express');
const path = require("path");
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

// AWS SDK v3 imports for API signing
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { Sha256 } = require("@aws-crypto/sha256-browser");
const axios = require("axios");

// Debug logging for environment setup
console.log("Starting server...");
console.log("Environment:", process.env.NODE_ENV);
console.log("AWS Configuration:");
console.log("- AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "Exists" : "Missing");
console.log("- AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "Exists" : "Missing");
console.log("- AWS_REGION:", process.env.AWS_REGION);
console.log("Allowed Origins for CORS:", allowedOrigins);

// Enhanced Utility Functions
async function getUserCredits(email) {
  if (!email) {
    logger.error("No email provided to getUserCredits");
    return 0;
  }

  const params = {
    TableName: USER_CREDITS_TABLE,
    Key: { email: email },
  };

  try {
    logger.info(`Fetching credits for user: ${email}`);
    const result = await dynamoDBDocClient.send(new GetCommand(params));
    return result.Item ? result.Item.credits : 0;
  } catch (error) {
    logger.error("Error fetching user credits:", error);
    return 0;
  }
}

async function updateUserCreditsWithRetry(email, credits, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      logger.info(`Attempt ${retries + 1}: Updating credits for user ${email} to ${credits}`);
      await dynamoDBDocClient.send(
        new UpdateCommand({
          TableName: USER_CREDITS_TABLE,
          Key: { email },
          UpdateExpression: "SET credits = :credits",
          ExpressionAttributeValues: { ":credits": credits },
          ReturnValues: "UPDATED_NEW",
        })
      );
      logger.info(`Successfully updated credits for ${email}`);
      return true;
    } catch (error) {
      logger.error(`Attempt ${retries + 1} failed:`, error);
      retries++;
      if (retries === maxRetries) {
        throw new Error('Failed to update credits after multiple attempts');
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
}

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

async function logSearchHistory(
  email,
  searchQuery,
  requestID,
  status,
  rawResponse = null,
  EnVrequestID = null
) {
  const now = new Date();
  const timestamp = new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString();

  try {
    logger.info(`Logging search history for ${email}, requestID: ${requestID}`);
    await dynamoDBDocClient.send(
      new PutCommand({
        TableName: SEARCH_HISTORY_TABLE,
        Item: {
          requestID,
          timestamp,
          email,
          EnVrequestID: EnVrequestID || "N/A",
          searchQuery,
          status,
          rawResponse: rawResponse ? JSON.stringify(rawResponse) : "N/A",
        },
      })
    );
    logger.info("Search history logged successfully:", { requestID, email });
  } catch (error) {
    logger.error("Error logging search history:", {
      errorMessage: error.message,
      requestID,
      email,
      stack: error.stack,
    });
    throw error;
  }
}

async function validatePurchaseRequest(email, priceId, paymentMethodId) {
  if (!email || !priceId || !paymentMethodId) {
    throw new Error('Missing required fields');
  }

  // Verify user exists
  const userCredits = await getUserCredits(email);
  if (userCredits === null) {
    await initializeUserCredits(email);
  }

  // Verify price ID is valid
  const creditTiers = {
    'price_1QOubIAUGHTClvwyCb4r0ffE': { amount: 200, credits: 3 },
    'price_1QOv9IAUGHTClvwyRj2ChIb3': { amount: 597, credits: 10 },
    'price_1QOv9IAUGHTClvwyzELdaAiQ': { amount: 1997, credits: 50 },
    'price_1QOv9IAUGHTClvwyxw7vJURF': { amount: 4997, credits: 150 },
    'price_1QOv9IAUGHTClvwyMRquKtpG': { amount: 11997, credits: 500 },
    'price_1QOv9IAUGHTClvwyBH9Jh7ir': { amount: 19997, credits: 1000 },
    'price_1QOv9IAUGHTClvwykbXsElbr': { amount: 27997, credits: 1750 }
  };

  if (!creditTiers[priceId]) {
    throw new Error('Invalid price ID');
  }

  return creditTiers[priceId];
}

async function signUpUser(userData) {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID, // Use environment variable
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
    logger.info(`Signing up user: ${userData.email}`);
    return await cognitoClient.send(new SignUpCommand(params));
  } catch (error) {
    logger.error("Error signing up user:", error);
    throw error;
  }
}

// Stripe Webhook Handler
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const customerEmail = session.metadata.userEmail;
      const creditsToAdd = parseInt(session.metadata.credits);
      
      // Fetch current credits
      const currentCredits = await getUserCredits(customerEmail);
      
      // Update with new credits
      await updateUserCredits(customerEmail, currentCredits + creditsToAdd);
      
      logger.info(`Credits updated after successful checkout: ${customerEmail} +${creditsToAdd}`);
    } catch (error) {
      logger.error('Error updating credits after checkout:', error);
    }
  }

  response.json({received: true});
});

// Enhanced Initialize User Function
async function initializeUserCredits(email) {
  try {
    const params = {
      TableName: USER_CREDITS_TABLE,
      Item: {
        email,
        credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ConditionExpression: "attribute_not_exists(email)"
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

// Routes
// Route: Secure Endpoint (Example for Token Validation)
app.post("/secure-endpoint", verifyToken, (req, res) => {
  res.json({ message: "Secure access granted", user: req.user });
});

// Route: Purchase Pack
app.post("/purchase-pack", async (req, res) => {
  const { email, priceId, paymentMethodId } = req.body;
  let paymentIntent = null;

  try {
    logger.info("Purchase pack request received:", { email, priceId, paymentMethodId });

    // Validate required fields
    if (!email || !priceId || !paymentMethodId) {
      throw new Error('Missing required fields');
    }

    // Ensure user exists in DynamoDB
    const currentCredits = await getUserCredits(email);
    if (currentCredits === null) {
      await initializeUserCredits(email);
    }

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email });
    let customer = customers.data.find((c) => c.email === email);

    if (!customer) {
      customer = await stripe.customers.create({ email });
      logger.info("Created new customer:", customer.id);
    }

    // Define credit tiers
    const creditTiers = {
      "price_1QOubIAUGHTClvwyCb4r0ffE": { amount: 200, credits: 3 },
      "price_1QOv9IAUGHTClvwyRj2ChIb3": { amount: 597, credits: 10 },
      "price_1QOv9IAUGHTClvwyzELdaAiQ": { amount: 1997, credits: 50 },
      "price_1QOv9IAUGHTClvwyxw7vJURF": { amount: 4997, credits: 150 },
      "price_1QOv9IAUGHTClvwyMRquKtpG": { amount: 11997, credits: 500 },
      "price_1QOv9IAUGHTClvwyBH9Jh7ir": { amount: 19997, credits: 1000 },
      "price_1QOv9IAUGHTClvwykbXsElbr": { amount: 27997, credits: 1750 }
    };

    const selectedTier = creditTiers[priceId];
    if (!selectedTier) {
      throw new Error('Invalid price ID');
    }

    // Create payment intent
    paymentIntent = await stripe.paymentIntents.create({
      amount: selectedTier.amount,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      metadata: {
        credits: selectedTier.credits,
        userEmail: email
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never"
      }
    });

    // Update credits with retry mechanism
    const newCredits = (currentCredits || 0) + selectedTier.credits;
    await updateUserCreditsWithRetry(email, newCredits);

    // Verify credits were updated
    const verified = await verifyCreditsUpdate(email, newCredits);
    if (!verified) {
      logger.error('Credits update verification failed', {
        email,
        expectedCredits: newCredits,
        paymentIntentId: paymentIntent.id
      });
      
      // Still return success but flag for admin attention
      res.status(200).send({
        message: "Payment processed successfully. Credits may take a few minutes to appear.",
        remainingCredits: await getUserCredits(email),
        requiresVerification: true
      });
      return;
    }

    // Success response
    res.status(200).send({
      message: "Credits purchased successfully.",
      remainingCredits: newCredits
    });

  } catch (err) {
    logger.error(`Error purchasing credits for ${email}:`, err);

    // If payment was processed but credits failed
    if (paymentIntent?.status === 'succeeded') {
      logger.error('CRITICAL: Payment succeeded but credits failed to update', {
        email,
        paymentIntentId: paymentIntent.id,
        error: err.message
      });

      res.status(500).send({
        error: {
          message: "Payment processed but credits may be delayed. Our team has been notified.",
          paymentIntentId: paymentIntent.id,
          requiresSupport: true
        }
      });
      return;
    }

    // Handle Stripe-specific errors
    if (err.type === 'StripeCardError') {
      res.status(400).send({
        error: {
          message: "Your card was declined. Please try a different payment method.",
          code: err.code
        }
      });
      return;
    }

    // General error response
    res.status(400).send({
      error: {
        message: err.message || "Purchase failed. Please try again."
      }
    });
  }
});

// Route: Create Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  const { email, priceId } = req.body;

  logger.info("Creating checkout session for:", { email, priceId });

  // Define the credit tiers and their Stripe price IDs
  const creditTiers = {
    "price_1QOv9IAUGHTClvwyRj2ChIb3": { amount: 597, credits: 10 },
    "price_1QOv9IAUGHTClvwyzELdaAiQ": { amount: 1997, credits: 50 },
    "price_1QOv9IAUGHTClvwyxw7vJURF": { amount: 4997, credits: 150 },
    "price_1QOv9IAUGHTClvwyMRquKtpG": { amount: 11997, credits: 500 },
    "price_1QOv9IAUGHTClvwyBH9Jh7ir": { amount: 19997, credits: 1000 },
    "price_1QOv9IAUGHTClvwykbXsElbr": { amount: 27997, credits: 1750 },
    "price_1QOubIAUGHTClvwyCb4r0ffE": { amount: 200, credits: 3 }
  };

  try {
    // Validate request data
    if (!email || !priceId) {
      logger.error("Missing required fields:", { email, priceId });
      return res.status(400).send({ error: "Email and Price ID are required" });
    }

    // Validate price ID
    if (!creditTiers[priceId]) {
      logger.error("Invalid price ID:", priceId);
      return res.status(400).send({ error: "Invalid price ID" });
    }

    // Look for an existing customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length === 0) {
      customer = await stripe.customers.create({
        email: email,
      });
      logger.info("Created new customer:", customer.id);
    } else {
      customer = existingCustomers.data[0];
      logger.info("Found existing customer:", customer.id);
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: "payment",
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: {
          credits: creditTiers[priceId].credits,
          userEmail: email
        }
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?status=cancel`,
      metadata: {
        credits: creditTiers[priceId].credits,
        userEmail: email
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      submit_type: "pay"
    });

    logger.info("Checkout session created:", {
      sessionId: session.id,
      customerId: customer.id,
      email: email
    });

    res.status(200).json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    logger.error("Error creating checkout session:", {
      error: error.message,
      stack: error.stack,
      email: email,
      priceId: priceId
    });
    res.status(500).send({ 
      error: "Failed to create checkout session",
      details: error.message
    });
  }
});

// Route: Get Payment Methods
app.post("/get-payment-methods", verifyToken, async (req, res) => {
    try {
        const email = req.user?.email;
        logger.info(`Fetching payment methods for user: ${email}`);

        if (!email) {
            return res.status(401).send({ error: "Unauthorized access" });
        }

        const customers = await stripe.customers.list({ email });
        const customer = customers.data.find((c) => c.email === email);

        if (!customer) {
            logger.info(`No Stripe customer found for email: ${email}`);
            return res.status(200).send({ paymentMethods: [], message: "No payment methods found" });
        }

        // Get the customer's default payment method
        const customerData = await stripe.customers.retrieve(customer.id);
        const defaultPaymentMethodId = customerData.invoice_settings?.default_payment_method;

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: "card",
        });

        const simplifiedMethods = paymentMethods.data.map((method) => ({
            id: method.id,
            brand: method.card.brand,
            last4: method.card.last4,
            exp_month: method.card.exp_month,
            exp_year: method.card.exp_year,
            isDefault: method.id === defaultPaymentMethodId // Add isDefault flag
        }));

        res.status(200).send({ paymentMethods: simplifiedMethods });
        logger.info(`Successfully retrieved payment methods for ${email}`);
    } catch (error) {
        logger.error("Error fetching payment methods:", error.message);
        res.status(500).send({ error: "Failed to fetch payment methods" });
    }
});

// Create setup intent route
app.post("/create-setup-intent", verifyToken, async (req, res) => {
    try {
        const email = req.user?.email;
        logger.info(`Creating setup intent for user: ${email}`);

        if (!email) {
            return res.status(401).send({ error: "Unauthorized access" });
        }

        const customers = await stripe.customers.list({ email });
        let customer = customers.data[0];
        
        if (!customer) {
            customer = await stripe.customers.create({ email });
            logger.info(`Created new customer: ${customer.id}`);
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: "card",
        });

        if (paymentMethods.data.length >= 2) {
            return res.status(400).send({ 
                error: "Maximum of 2 payment methods allowed. Please remove one before adding another." 
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'setup',
            customer: customer.id,
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?setup_success=true`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?setup_canceled=true`,
        });

        res.status(200).send({ url: session.url });
        logger.info(`Setup session created for ${email}: ${session.id}`);

    } catch (error) {
        logger.error("Error creating setup intent:", error);
        res.status(500).send({ error: "Failed to create setup intent" });
    }
});

// Set default payment method
app.post("/set-default-payment", verifyToken, async (req, res) => {
    try {
        const email = req.user?.email;
        const { paymentMethodId } = req.body;

        if (!email || !paymentMethodId) {
            return res.status(400).send({ error: "Email and payment method ID are required" });
        }

        const customers = await stripe.customers.list({ email });
        const customer = customers.data[0];

        if (!customer) {
            return res.status(404).send({ error: "Customer not found" });
        }

        // Update customer's default payment method
        await stripe.customers.update(customer.id, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // Get updated payment methods to return
        const customerData = await stripe.customers.retrieve(customer.id);
        const defaultPaymentMethodId = customerData.invoice_settings?.default_payment_method;

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: "card",
        });

        const simplifiedMethods = paymentMethods.data.map((method) => ({
            id: method.id,
            brand: method.card.brand,
            last4: method.card.last4,
            exp_month: method.card.exp_month,
            exp_year: method.card.exp_year,
            isDefault: method.id === defaultPaymentMethodId
        }));

        res.status(200).send({ success: true, paymentMethods: simplifiedMethods });
        logger.info(`Default payment method updated for ${email}`);
    } catch (error) {
        logger.error("Error setting default payment method:", error);
        res.status(500).send({ error: "Failed to set default payment method" });
    }
});

// Delete payment method
app.post("/delete-payment-method", verifyToken, async (req, res) => {
    try {
        const email = req.user?.email;
        const { paymentMethodId } = req.body;

        if (!email || !paymentMethodId) {
            return res.status(400).send({ error: "Email and payment method ID are required" });
        }

        const customers = await stripe.customers.list({ email });
        const customer = customers.data[0];

        if (!customer) {
            return res.status(404).send({ error: "Customer not found" });
        }

        // Check if this is the default payment method
        const customerData = await stripe.customers.retrieve(customer.id);
        const isDefault = customerData.invoice_settings?.default_payment_method === paymentMethodId;

        // If this is the default payment method and there's another payment method, set the other one as default
        if (isDefault) {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customer.id,
                type: "card",
            });

            const otherPaymentMethod = paymentMethods.data.find(pm => pm.id !== paymentMethodId);
            if (otherPaymentMethod) {
                await stripe.customers.update(customer.id, {
                    invoice_settings: {
                        default_payment_method: otherPaymentMethod.id,
                    },
                });
            }
        }

        // Detach the payment method
        await stripe.paymentMethods.detach(paymentMethodId);

        // Get updated payment methods to return
        const updatedPaymentMethods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: "card",
        });

        const updatedCustomerData = await stripe.customers.retrieve(customer.id);
        const defaultPaymentMethodId = updatedCustomerData.invoice_settings?.default_payment_method;

        const simplifiedMethods = updatedPaymentMethods.data.map((method) => ({
            id: method.id,
            brand: method.card.brand,
            last4: method.card.last4,
            exp_month: method.card.exp_month,
            exp_year: method.card.exp_year,
            isDefault: method.id === defaultPaymentMethodId
        }));

        res.status(200).send({ success: true, paymentMethods: simplifiedMethods });
        logger.info(`Payment method deleted for ${email}`);
    } catch (error) {
        logger.error("Error deleting payment method:", error);
        res.status(500).send({ error: "Failed to delete payment method" });
    }
});

// Route: Get Purchase History
app.post("/get-purchase-history", async (req, res) => {
    const { email } = req.body;
    logger.info(`Fetching purchase history for user: ${email}`);

    if (!email) {
        return res.status(400).send({ error: { message: "Email is required" } });
    }

    try {
        const customers = await stripe.customers.list({ email });
        const customer = customers.data.find((c) => c.email === email);

        if (!customer) {
            logger.info(`No Stripe customer found for email: ${email}`);
            return res.status(200).send({ history: [], message: "No purchase history found" });
        }

        const paymentIntents = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 10,
        });

        const history = paymentIntents.data.map((payment) => ({
            amount: payment.amount / 100,
            currency: payment.currency.toUpperCase(),
            status: payment.status,
            date: new Date(payment.created * 1000).toLocaleString(),
            description: payment.description || "Credit Purchase",
        }));

        res.status(200).send({ history });
        logger.info(`Successfully retrieved purchase history for ${email}`);
    } catch (error) {
        logger.error(`Error fetching purchase history: ${error.message}`);
        res.status(500).send({ error: "Failed to fetch purchase history" });
    }
});

// Route: Check or Fetch Credits
app.post("/check-credits", async (req, res) => {
  console.log("Check Credits endpoint hit");
  
  // Log the request headers and body
  console.log("Request headers:", req.headers);
  console.log("Request body:", req.body);

  const { email } = req.body;

  if (!email) {
    console.warn("Check Credits: Email is missing in request body");
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    console.log(`Fetching credits for email: ${email}`);
    const credits = await getUserCredits(email);
    console.log(`Credits fetched successfully for ${email}:`, credits);

    res.status(200).json({ email, credits });
  } catch (err) {
    console.error("Error checking credits:", err);
    res.status(500).json({ error: "Failed to fetch credits" });
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
  region: process.env.AWS_REGION, // Dynamic region from environment variables
  credentials: {
    accessKeyId: process.env.API_ACCESS_KEY_ID, // Custom environment variable for external API
    secretAccessKey: process.env.API_SECRET_ACCESS_KEY, // Custom environment variable for external API
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
    await updateUserCreditsWithRetry(email, credits - creditCost);

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
    logger.error("No email provided for search history request");
    return res.status(400).send({ error: { message: "Email is required" } });
  }

  try {
    logger.info(`Fetching search history for user: ${email}`);
    const data = await dynamoDBDocClient.send(new ScanCommand({
      TableName: SEARCH_HISTORY_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email
      }
    }));

    if (!data.Items) {
      logger.info(`No search history found for user: ${email}`);
      return res.status(200).send({ history: [] });
    }

    logger.info(`Found ${data.Items.length} history items for user: ${email}`);
    res.status(200).send({ history: data.Items });
  } catch (error) {
    logger.error(`Error fetching search history: ${error.message}`, { email });
    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
});

// Utility function to sign up a user in Cognito
async function signUpUser(userData) {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID, // Use environment variable
    Username: userData.email,
    Password: userData.password, // User-provided password
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
    // Create a SignUpCommand and send it to Cognito
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);
    return response;
  } catch (err) {
    console.error("Error signing up user:", err);
    throw err;
  }
}

// Route: User Signup
app.post("/signup", async (req, res) => {
  const {
    name,
    email,
    phone,
    companyName,
    companyWebsite,
    companyEIN,
    useCase,
    termsAccepted,
    password, // User-provided password
  } = req.body;

  // Check if Terms and Conditions are accepted
  if (!termsAccepted) {
    return res
      .status(400)
      .json({ success: false, message: "Terms and Conditions must be accepted." });
  }

  try {
    // Prepare user data for signup
    const userData = {
      name,
      email,
      phone,
      companyName,
      companyWebsite,
      companyEIN,
      useCase,
      password, // Include the password provided by the user
    };

    // Call the utility function to sign up the user
    await signUpUser(userData);

    // Respond with success
    return res
      .status(200)
      .json({ success: true, message: "User signup successful." });
  } catch (err) {
    console.error("Error signing up user:", err);

    // Handle Cognito-specific errors (e.g., UserExistsException)
    if (err.name === "UsernameExistsException") {
      return res
        .status(409)
        .json({ success: false, message: "User already exists." });
    }

    // Handle general errors
    return res
      .status(500)
      .json({ success: false, message: "Internal server error. Please try again." });
  }
});

// Route: Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    // Parameters for Cognito login
    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID, // Use environment variable
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    // Initiate Cognito authentication
    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    // Extract tokens from Cognito response
    const accessToken = response.AuthenticationResult.AccessToken;
    const idToken = response.AuthenticationResult.IdToken;
    const refreshToken = response.AuthenticationResult.RefreshToken;

    // Set tokens as secure, HttpOnly cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "Strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie("idToken", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "Strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Respond with success (no tokens in response body for added security)
    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login error:", err);

    // Handle specific Cognito exceptions
    if (err.name === "NotAuthorizedException") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }
    if (err.name === "UserNotFoundException") {
      return res.status(404).json({
        success: false,
        message: "User does not exist.",
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again.",
    });
  }
});

// Route: Validate Authentication
app.get("/auth/validate", (req, res) => {
  const accessToken = req.cookies.accessToken; // Get accessToken from cookies

  if (!accessToken) {
    console.error("No access token found in cookies");
    return res.status(401).json({ success: false, message: "No access token found" });
  }

  // Function to retrieve the signing key
  const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error("Error fetching signing key:", err.message);
        return callback(err);
      }
      callback(null, key.getPublicKey());
    });
  };

  // Verify the access token
  jwt.verify(accessToken, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      console.error("Token validation failed:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Log decoded token for debugging
    console.info("Token successfully validated:", decoded);

    // Send user data if token is valid
    res.status(200).json({ success: true, user: decoded });
  });
});

// Catch-All Route to Handle Proxy Paths
app.all("*", (req, res) => {
  const { path, method, body } = req;

  console.log(`Received request: ${method} ${path}`);
  console.log("Request body:", body);

  res.status(200).json({
    message: "Lambda is connected and receiving requests",
    method,
    path,
    body,
  });
});

// Move this to be the last route in server.js
app.use((req, res) => {
  logger.warn('Unhandled route accessed:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.path
  });
});

// Import the file system module
const fs = require('fs');

// Static file handling
if (isLambda) {
  // In Lambda, we only handle API routes
  app.all('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.status(404).json({ error: 'Not Found' });
  });
} else {
  // Local development static file serving
  const buildPath = path.join(__dirname, 'build');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(buildPath, 'index.html'));
      }
    });
  } else {
    logger.warn('Build directory not found for local development');
  }
}

// Log before starting the server
console.log("Starting the server...");

// Server startup and environment configuration
if (!isLambda) {
  // Local development server
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    logger.info(`Development server running on http://localhost:${port}`);
  });
} else {
  // Lambda handler setup
  const awsServerlessExpress = require('aws-serverless-express');
  const server = awsServerlessExpress.createServer(app);

  // Lambda event handler function
  exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false; // Prevent Lambda from waiting for the event loop to empty

    const requestId = context.awsRequestId; // Set up consistent logging context
    const logContext = {
      requestId,
      path: event.path || event.requestContext?.http?.path,
      method: event.httpMethod || event.requestContext?.http?.method,
    };

    try {
      // Normalize API Gateway v2 events for compatibility
      if (event.version === '2.0') {
        event = {
          ...event,
          httpMethod: event.requestContext.http.method,
          path: event.requestContext.http.path,
        };
      }

      // Ensure body is a string for Express compatibility
      if (event.body && typeof event.body === 'object') {
        event.body = JSON.stringify(event.body);
      }

      // Configure CORS headers
      const headers = {
        'Access-Control-Allow-Origin': Array.isArray(allowedOrigins) && allowedOrigins.includes(event.headers?.origin)
          ? event.headers.origin
          : (allowedOrigins?.[0] || '*'), // Fallback to first origin or wildcard
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true',
      };

      // Handle OPTIONS preflight requests
      if (event.httpMethod === 'OPTIONS') {
        logger.info('Handling CORS preflight request', logContext);
        return {
          statusCode: 200,
          headers,
          body: '',
        };
      }

      // Log incoming request details
      logger.info('Processing request', {
        ...logContext,
        headers: event.headers,
        body: event.body,
      });

      // Process request through aws-serverless-express
      const response = await awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;

      // Add CORS headers to response
      const finalResponse = {
        ...response,
        headers: {
          ...response.headers,
          ...headers,
        },
      };

      // Log successful response
      logger.info('Request completed successfully', {
        ...logContext,
        statusCode: finalResponse.statusCode,
      });

      return finalResponse;
    } catch (error) {
      // Log error details
      logger.error('Request failed', {
        ...logContext,
        error: error.message,
        stack: error.stack,
      });

      // Return formatted error response
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Array.isArray(allowedOrigins) && allowedOrigins.includes(event.headers?.origin)
            ? event.headers.origin
            : (allowedOrigins?.[0] || '*'), // Fallback to first origin or wildcard
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: isProduction ? 'An unexpected error occurred' : error.message,
          requestId,
        }),
      };
    }
  };
}
