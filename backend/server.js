// Load dependencies and configuration
const {
  app,
  express,
  stripe,
  logger,
  FRONTEND_URL,
  verifyToken,
  dynamoDBDocClient,
  CREDIT_COSTS,
  USER_CREDITS_TABLE,
  SEARCH_HISTORY_TABLE,
  allowedOrigins,
  stripePriceIDs,
  isLambda,
  ENVIRONMENT,
  isProduction,
  signer,
  getUserCredits,
  updateUserCreditsWithRetry,
  logSearchHistory,
  signUpUser,
  cognitoClient,
  InitiateAuthCommand,
  SignatureV4,
  Sha256,
  HttpRequest,
  validateEnvironmentVariables,
  initializeUserCredits,
  verifyCreditsUpdate,
  validatePurchaseRequest,
  API_ENDPOINT
} = require("./server-config");

// Third-party dependencies
const awsServerlessExpress = require('aws-serverless-express');
const path = require("path");
const axios = require("axios");



// AWS SDK imports
const {
  GetCommand,
  ScanCommand,
  UpdateCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

// Debug logging for environment setup
logger.info("Server Configuration:", {
  environment: ENVIRONMENT,
  frontendUrl: FRONTEND_URL,
  apiEndpoint: API_ENDPOINT,
  aws: {
    region: process.env.AWS_REGION,
    hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
  },
  isProduction,
  isLambda,
  corsOrigins: allowedOrigins
});

// Enhanced Utility Functions
// Enhanced Stripe Webhook Handler
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;

    try {
      // Verify and construct the event
      event = stripe.webhooks.constructEvent(
        request.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info('Successfully constructed Stripe event:', {
        type: event.type,
        id: event.id,
      });

      switch (event.type) {
       case "checkout.session.completed": {
  const session = event.data.object;

  logger.info("Processing checkout.session.completed:", {
    sessionId: session.id,
    metadata: session.metadata,
  });

  try {
    const customerEmail = session.metadata?.userEmail;
    const creditsToAdd = parseInt(session.metadata?.credits, 10);
    const paymentIntentId = session.payment_intent;

    if (!customerEmail || isNaN(creditsToAdd) || creditsToAdd <= 0) {
      throw new Error("Invalid metadata in session");
    }

    // Step 1: Retrieve Payment Intent and Payment Method
    let paymentMethodId;
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        paymentMethodId = paymentIntent.payment_method;

        if (paymentMethodId) {
          logger.info("Retrieved payment method:", { paymentMethodId });

          // Check if the payment method is already attached to the customer
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

          if (paymentMethod.customer !== session.customer) {
            // Attach payment method to customer if not already attached
            logger.info("Attaching payment method to customer:", {
              paymentMethodId,
              customerId: session.customer,
            });

            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: session.customer,
            });

            // Set payment method as default
            await stripe.customers.update(session.customer, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });

            logger.info("Default payment method updated successfully.");
          } else {
            logger.info("Payment method is already attached to the customer.");
          }
        } else {
          logger.warn("No payment method found to attach for session:", {
            sessionId: session.id,
          });
        }
      } catch (error) {
        logger.error("Error attaching or setting default payment method:", {
          error: error.message,
        });
      }
    } else {
      logger.warn("No payment method available to attach or set as default.");
    }

    // Step 2: Update User Credits
    let currentCredits = 0;
    try {
      currentCredits = await getUserCredits(customerEmail);
      logger.info("Current credits:", { customerEmail, currentCredits });
    } catch (error) {
      logger.warn("No credit record found, initializing user:", { customerEmail });
      await initializeUserCredits(customerEmail);
    }

    const newTotalCredits = currentCredits + creditsToAdd;
    await updateUserCreditsWithRetry(customerEmail, newTotalCredits);

    logger.info("Credits updated successfully:", {
      customerEmail,
      previousCredits: currentCredits,
      addedCredits: creditsToAdd,
      newTotalCredits,
    });

    // Step 3: Log Payment History
    if (typeof logPaymentHistory === "function") {
      await logPaymentHistory(customerEmail, {
        productId: session.metadata?.productId || "Unknown",
        credits: creditsToAdd || "N/A",
        amount: session.amount_total / 100, // Amount in dollars
        status: "succeeded",
        sessionId: session.id,
      });
    } else {
      logger.error("logPaymentHistory function is not defined.");
    }
  } catch (err) {
    logger.error("Error processing checkout.session.completed:", {
      error: err.message,
      stack: err.stack,
      sessionId: session.id,
    });
    throw err;
  }
  break;
}


        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;

          logger.info("Processing payment_intent.succeeded:", {
            paymentIntentId: paymentIntent.id,
            metadata: paymentIntent.metadata,
          });

          // Skip processing if handled by `checkout.session.completed`
          if (paymentIntent.metadata?.fromCheckoutSession) {
            logger.info(
              "Skipping payment_intent.succeeded as credits handled by checkout.session.completed",
              { paymentIntentId: paymentIntent.id }
            );
            break;
          }

          try {
            const customerEmail = paymentIntent.metadata?.userEmail;
            const creditsToAdd = parseInt(paymentIntent.metadata?.credits, 10);

            if (!customerEmail || isNaN(creditsToAdd) || creditsToAdd <= 0) {
              throw new Error("Invalid metadata in payment intent");
            }

            let currentCredits = 0;
            try {
              currentCredits = await getUserCredits(customerEmail);
              logger.info("Current credits:", { customerEmail, currentCredits });
            } catch (error) {
              logger.warn("No credit record found, initializing user:", {
                customerEmail,
              });
              await initializeUserCredits(customerEmail);
            }

            const newTotalCredits = currentCredits + creditsToAdd;
            await updateUserCreditsWithRetry(customerEmail, newTotalCredits);

            logger.info("Credits updated successfully:", {
              customerEmail,
              previousCredits: currentCredits,
              addedCredits: creditsToAdd,
              newTotalCredits,
            });
          } catch (err) {
            logger.error("Error processing payment_intent.succeeded:", {
              error: err.message,
              stack: err.stack,
              paymentIntentId: paymentIntent.id,
            });
            throw err;
          }
          break;
        }

        default:
          logger.warn(`Unhandled event type: ${event.type}`);
      }

      response.status(200).json({ received: true });
    } catch (err) {
      logger.error("Webhook error:", {
        error: err.message,
        stack: err.stack,
        headers: request.headers,
        rawBody: request.body.toString('utf8'),
      });

      response.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);



// Routes
// Route: Secure Endpoint (Example for Token Validation)
app.post("/secure-endpoint", verifyToken, (req, res) => {
  res.json({ message: "Secure access granted", user: req.user });
});

// Route: Purchase Pack
app.post("/purchase-pack", async (req, res) => {
  const { email, productId, paymentMethodId } = req.body;

  // Log the incoming payload
  logger.info("Purchase pack request received:", { email, productId, paymentMethodId });

  let paymentIntent = null;

  try {
    // Validate required fields
    if (!email || !productId || !paymentMethodId) {
      logger.error("Missing required fields:", { email, productId, paymentMethodId });
      return res.status(400).json({ error: "Missing required fields: email, productId, or paymentMethodId" });
    }

    // Retrieve or create the Stripe customer
    const customers = await stripe.customers.list({ email });
    let customer = customers.data.find((c) => c.email === email);

    if (!customer) {
      customer = await stripe.customers.create({ email });
      logger.info("Created new Stripe customer:", { customerId: customer.id });
    }

    // Define credit tiers by productId
    const creditTiersByProductId = {
      prod_basic3: { amount: 200, credits: 3 },
      prod_basic10: { amount: 597, credits: 10 },
      prod_basic50: { amount: 1997, credits: 50 },
      prod_popular150: { amount: 4997, credits: 150 },
      prod_premium500: { amount: 11997, credits: 500 },
      prod_premium1000: { amount: 19997, credits: 1000 },
      prod_premium1750: { amount: 27997, credits: 1750 },
    };

    // Validate productId and retrieve the associated tier
    const selectedTier = creditTiersByProductId[productId];
    if (!selectedTier) {
      logger.error("Invalid product ID:", { productId });
      return res.status(400).json({ error: `Invalid product ID: ${productId}` });
    }

    // Dynamically determine the frontend URL
    const origin = req.headers.origin;
    const frontendUrl = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    // Log selected tier details
    logger.info("Selected tier details:", selectedTier);

    // Create the payment intent with metadata for the webhook
paymentIntent = await stripe.paymentIntents.create({
  amount: selectedTier.amount,
  currency: "usd",
  customer: customer.id,
  payment_method: paymentMethodId,
  confirm: true,
  metadata: {
    credits: selectedTier.credits.toString(),
    userEmail: email,
    productId: productId,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    fromCheckoutSession: false, // Indicates this is not from checkout.session
  },
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: "never",
  },
});



    logger.info("Payment intent created:", {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: selectedTier.amount,
      credits: selectedTier.credits,
    });

    // Update user's credits in the database
    const currentCredits = await getUserCredits(email);
    const newTotalCredits = currentCredits + selectedTier.credits;

    await updateUserCreditsWithRetry(email, newTotalCredits);
    logger.info("User credits updated successfully:", { email, newTotalCredits });

    // Return the updated credit balance in the response
    res.status(200).json({
      message: "Payment processed successfully.",
      paymentIntentId: paymentIntent.id,
      remainingCredits: newTotalCredits,
    });
  } catch (err) {
    logger.error("Error in purchase-pack:", {
      error: err.message,
      email,
      productId,
      paymentIntentId: paymentIntent?.id,
    });

    // Handle Stripe-specific errors
    if (err.type === "StripeCardError") {
      return res.status(400).json({
        error: {
          message: "Your card was declined. Please try a different payment method.",
          code: err.code,
        },
      });
    }

    // General error response
    res.status(400).json({
      error: {
        message: err.message || "Purchase failed. Please try again.",
      },
    });
  }
});


// Route: Create Checkout Session
// Route: Create Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  const { email, productId } = req.body;

  logger.info("Creating checkout session for:", { email, productId });

  // Define credit tiers and their details
  const creditTiers = {
    prod_basic3: { amount: 200, credits: 3 },
    prod_basic10: { amount: 597, credits: 10 },
    prod_basic50: { amount: 1997, credits: 50 },
    prod_popular150: { amount: 4997, credits: 150 },
    prod_premium500: { amount: 11997, credits: 500 },
    prod_premium1000: { amount: 19997, credits: 1000 },
    prod_premium1750: { amount: 27997, credits: 1750 },
  };

  try {
    // Validate request data
    if (!email || !productId) {
      logger.error("Missing required fields:", { email, productId });
      return res.status(400).send({ error: "Email and productId are required" });
    }

    // Validate productId
    const priceId = stripePriceIDs[productId];
    const creditTier = creditTiers[productId];
    if (!priceId || !creditTier) {
      logger.error("Invalid productId or missing mappings:", { productId });
      return res.status(400).send({ error: "Invalid productId or missing mappings" });
    }

    const { amount, credits } = creditTier;

    // Determine the correct frontend URL
    const frontendUrl =
      process.env.FRONTEND_URL ||
      (process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://app.contactvalidate.com"
        : "https://testing.contactvalidate.com");

    // Look for or create a customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    if (existingCustomers.data.length === 0) {
      customer = await stripe.customers.create({ email });
      logger.info(`Created new customer: ${customer.id}`);
    } else {
      customer = existingCustomers.data[0];
      logger.info(`Found existing customer: ${customer.id}`);
    }

    // Log session creation details
    logger.info("Preparing to create Stripe Checkout Session with:", {
      productId,
      priceId,
      amount,
      credits,
      email,
      frontendUrl,
    });

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        setup_future_usage: "off_session", // Save payment method for future use
        metadata: {
          credits: credits.toString(),
          userEmail: email,
          productId: productId,
          environment: process.env.REACT_APP_ENVIRONMENT || "development",
          timestamp: new Date().toISOString(),
        },
      },
      metadata: {
        credits: credits.toString(),
        userEmail: email,
        productId: productId,
        environment: process.env.REACT_APP_ENVIRONMENT || "development",
        timestamp: new Date().toISOString(),
      },
      success_url: `${frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${frontendUrl}/dashboard?status=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      submit_type: "pay",
    });

    // Log successful session creation
    logger.info("Checkout session created successfully:", {
      sessionId: session.id,
      customerId: customer.id,
      email,
      credits,
      productId,
    });

    // Send the session URL back to the client
    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    // Log error details
    logger.error("Error creating checkout session:", {
      error: error.message,
      stack: error.stack,
      email,
      productId,
    });
    res.status(500).send({ error: "Failed to create checkout session", details: error.message });
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

    if (!email) {
      logger.error("Unauthorized access: Missing email.");
      return res.status(401).send({ error: "Unauthorized access" });
    }

    logger.info(`Creating setup intent for user: ${email}`);

    // Retrieve or create Stripe customer
    const customers = await stripe.customers.list({ email });
    let customer = customers.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email });
      logger.info(`Created new customer: ${customer.id}`);
    }

    // Ensure the customer has fewer than 2 payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });

    if (paymentMethods.data.length >= 2) {
      logger.warn("User has maximum allowed payment methods:", { email });
      return res.status(400).send({
        error: "Maximum of 2 payment methods allowed. Please remove one before adding another.",
      });
    }

    // Create Stripe Checkout session in "setup" mode
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "setup",
      customer: customer.id,
      billing_address_collection: 'required',
      success_url: `${frontendUrl}/dashboard?setup_success=true`,
      cancel_url: `${frontendUrl}/dashboard?setup_canceled=true`,
    });

    logger.info(`Setup session created: ${session.id}`, { email });
    res.status(200).send({ url: session.url });
  } catch (error) {
    logger.error("Error in /create-setup-intent:", { message: error.message, stack: error.stack });
    res.status(500).send({ error: "Failed to create setup intent." });
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

    if (!email) {
        return res.status(400).send({ error: { message: "Email is required" } });
    }

    try {
        // Fetch Stripe customer
        const customers = await stripe.customers.list({ email });
        const customer = customers.data.find((c) => c.email === email);

        if (!customer) {
            return res.status(200).send({ history: [], message: "No purchase history found" });
        }

        // Fetch payment intents
        const paymentIntents = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 50,
        });

        // Fetch checkout sessions (include $0 transactions)
        const checkoutSessions = await stripe.checkout.sessions.list({
            customer: customer.id,
            limit: 50,
        });

        // Map product IDs to readable descriptions
        const productMap = {
            prod_basic3: { name: "3 Credits Pack", credits: 3 },
            prod_basic10: { name: "10 Credits Pack", credits: 10 },
            prod_basic50: { name: "50 Credits Pack", credits: 50 },
            prod_popular150: { name: "150 Credits Pack", credits: 150 },
            prod_premium500: { name: "500 Credits Pack", credits: 500 },
            prod_premium1000: { name: "1000 Credits Pack", credits: 1000 },
            prod_premium1750: { name: "1750 Credits Pack", credits: 1750 },
            "price_1QOubIAUGHTClvwyCb4r0ffE": { name: "3 Credits Pack", credits: 3 }, // $2 test product mapping
        };

        // Combine payment intents and checkout sessions
        const history = [
            ...paymentIntents.data.map((payment) => ({
                amount: payment.amount / 100,
                currency: payment.currency.toUpperCase(),
                status: payment.status,
                date: new Date(payment.created * 1000).toLocaleString(),
                description: productMap[payment.metadata?.productId]?.name || "Unknown Product",
                credits: productMap[payment.metadata?.productId]?.credits || "N/A",
            })),
            ...checkoutSessions.data
                .filter((session) => session.amount_total === 0) // Only include $0 transactions
                .map((session) => ({
                    amount: 0,
                    currency: "USD",
                    status: "succeeded",
                    date: new Date(session.created * 1000).toLocaleString(),
                    description: productMap[session.metadata?.productId]?.name || "No-cost Order",
                    credits: productMap[session.metadata?.productId]?.credits || "N/A",
                })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).send({ history });
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
    await updateUserCreditsWithRetry(email, newCredits);

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
const url = new URL(process.env.API_ENDPOINT);

const request = new HttpRequest({
  hostname: url.hostname,
  path: url.pathname,
  method: "POST",
  body: JSON.stringify(payload),
  headers: {
    "Content-Type": "application/json",
    Host: url.hostname,
    "x-api-key": process.env.API_KEY,
  },
});

// Use the shared signer from server-config.js
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