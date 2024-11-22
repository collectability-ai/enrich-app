require("dotenv").config(); // Load environment variables at the very top

const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_TEST_SECRET_KEY); // Use the secret key from the environment variable
const winston = require("winston");

// Initialize Winston logger (existing code)
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

app.use(bodyParser.json());

// Initialize user credits tracking
let userCredits = {};

// Log server initialization
logger.info("Server initialized.");

// Route: Purchase Pack
app.post("/purchase-pack", async (req, res) => {
  const { email, priceId } = req.body;

  try {
    // Find or create customer
    const customers = await stripe.customers.list({ email });
    let customer = customers.data.find((c) => c.email === email);

    if (!customer) {
      customer = await stripe.customers.create({ email });
    }

    // Check for existing default payment method
    let paymentMethodId = customer.invoice_settings.default_payment_method;

    if (!paymentMethodId) {
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
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { 
        enabled: true,
        allow_redirects: "never" 
      },
    });

    // Add credits to the user
    if (!userCredits[email]) {
      userCredits[email] = 0;
    }
    userCredits[email] += pack.credits;

    logger.info(`Credits updated for ${email}: ${userCredits[email]}`);
    res.status(200).send({
      message: "Pack purchased successfully.",
      remainingCredits: userCredits[email],
    });
  } catch (err) {
    logger.error(`Error purchasing pack for ${email}: ${err.message}`);
    res.status(400).send({ error: { message: err.message } });
  }
});

// Route: Check or Fetch Credits
app.post("/check-credits", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ error: { message: "Email is required" } });
  }

  const credits = userCredits[email] || 0; // Default to 0 if no credits
  logger.info(`Credits checked for ${email}: ${credits}`);
  
  // Ensure no modification occurs
  res.status(200).send({ email, remainingCredits: credits });
});

// Route: Use a Search
app.post("/use-search", (req, res) => {
  const { email } = req.body;

  if (!userCredits[email] || userCredits[email] <= 0) {
    logger.info(`User ${email} attempted a search with no credits.`);
    return res.status(403).send({
      error: {
        message: "No remaining credits. Please purchase a new pack.",
        purchaseRequired: true,
      },
    });
  }

  // Deduct one credit
  userCredits[email] -= 1;

  logger.info(`User ${email} used a search. Remaining credits: ${userCredits[email]}`);
  res.status(200).send({
    message: "Search recorded successfully.",
    remainingCredits: userCredits[email],
  });
});

// Temporary Route: Reset Credits (for Debugging)
app.post("/reset-credits", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ error: { message: "Email is required" } });
  }

  userCredits[email] = 0; // Reset credits to 0
  logger.info(`Credits reset for ${email}`);
  res.status(200).send({ message: `Credits reset for ${email}` });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
