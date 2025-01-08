// src/config.js

// Product to Price ID mapping
const PRODUCT_TO_PRICE_MAP = {
  basic3: {
    productId: 'prod_basic3',
    priceId: 'price_1QOubIAUGHTClvwyCb4r0ffE',
    credits: 3,
    price: 2.0,
    type: "basic"
  },
  basic10: {
    productId: 'prod_basic10',
    priceId: 'price_1QOv9IAUGHTClvwyRj2ChIb3',
    credits: 10,
    price: 5.97,
    type: "basic"
  },
  basic50: {
    productId: 'prod_basic50',
    priceId: 'price_1QOv9IAUGHTClvwyzELdaAiQ',
    credits: 50,
    price: 19.97,
    type: "basic"
  },
  popular150: {
    productId: 'prod_popular150',
    priceId: 'price_1QOv9IAUGHTClvwyxw7vJURF',
    credits: 150,
    price: 49.97,
    type: "popular"
  },
  premium500: {
    productId: 'prod_premium500',
    priceId: 'price_1QOv9IAUGHTClvwyMRquKtpG',
    credits: 500,
    price: 119.97,
    type: "premium"
  },
  premium1000: {
    productId: 'prod_premium1000',
    priceId: 'price_1QOv9IAUGHTClvwyBH9Jh7ir',
    credits: 1000,
    price: 199.97,
    type: "premium"
  },
  premium1750: {
    productId: 'prod_premium1750',
    priceId: 'price_1QOv9IAUGHTClvwykbXsElbr',
    credits: 1750,
    price: 279.97,
    type: "premium"
  }
};

// Utility function to get price ID from product ID
const getPriceIdFromProductId = (productId) => {
  const product = Object.values(PRODUCT_TO_PRICE_MAP).find(p => p.productId === productId);
  return product ? product.priceId : null;
};

// Utility function to get product details by product ID
const getProductById = (productId) => {
  return Object.values(PRODUCT_TO_PRICE_MAP).find(p => p.productId === productId) || null;
};

// Main configuration object
const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '',
  API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT || `${process.env.REACT_APP_API_BASE_URL}/api`,

  // AWS Amplify Configuration
  AWS_REGION: process.env.REACT_APP_AWS_REGION || 'us-east-2',
  USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID || 'us-east-2_EHz7xWNbm',
  USER_POOL_WEB_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '4gscq7ph13fjd9vu15comd6gcs',
  IDENTITY_POOL_ID: process.env.REACT_APP_IDENTITY_POOL_ID || 'us-east-2:f9c3a654-2df9-49fb-8161-09cbc0c58634',

  // Authentication Configuration
  AUTH_DOMAIN: process.env.REACT_APP_AUTH_DOMAIN || '',
  REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN || '',
  REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT || '',

  // Stripe Configuration
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLIC_KEY || '',
  PRODUCT_TO_PRICE_MAP,
  getPriceIdFromProductId,
  getProductById,

  // Session Management
  SESSION_EMAIL_KEY: process.env.REACT_APP_SESSION_EMAIL_KEY || 'pendingVerificationEmail',
  COOKIE_DOMAIN: process.env.REACT_APP_COOKIE_DOMAIN || '',

  // Environment
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  STAGE: process.env.REACT_APP_STAGE || 'dev',
};

// Debug Logging
if (process.env.NODE_ENV === 'development') {
  console.log("Configuration:", config);
}

export default config;