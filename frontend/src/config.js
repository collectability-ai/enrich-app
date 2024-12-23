// src/config.js

const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT,

  // AWS Amplify Configuration
  AWS_REGION: process.env.REACT_APP_AWS_REGION || 'us-east-2',
  USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID || 'us-east-2_EHz7xWNbm',
  USER_POOL_WEB_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '64iqduh82e6tvd5orlkn7rktc8',
  IDENTITY_POOL_ID: process.env.REACT_APP_IDENTITY_POOL_ID || 'us-east-2:f9c3a654-2df9-49fb-8161-09cbc0c58634',

  // Authentication Configuration
  AUTH_DOMAIN: process.env.REACT_APP_AUTH_DOMAIN || 'us-east-2ehz7xwnbm.auth.us-east-2.amazoncognito.com',
  REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000/',
  REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000/',

  // Stripe Configuration
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLIC_KEY,

  // Session Management
  SESSION_EMAIL_KEY: process.env.REACT_APP_SESSION_EMAIL_KEY || 'pendingVerificationEmail',
  COOKIE_DOMAIN: process.env.REACT_APP_COOKIE_DOMAIN || 'localhost',
  
  // Environment
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  STAGE: process.env.REACT_APP_STAGE || 'dev'
};

// Debug Logging for Environment Variables
console.log("Environment Variables Debug:", {
  API_BASE_URL: config.API_BASE_URL,
  API_ENDPOINT: config.API_ENDPOINT,
  AWS_REGION: config.AWS_REGION,
  USER_POOL_ID: config.USER_POOL_ID,
  USER_POOL_WEB_CLIENT_ID: config.USER_POOL_WEB_CLIENT_ID,
  IDENTITY_POOL_ID: config.IDENTITY_POOL_ID,
  AUTH_DOMAIN: config.AUTH_DOMAIN,
  REDIRECT_SIGN_IN: config.REDIRECT_SIGN_IN,
  REDIRECT_SIGN_OUT: config.REDIRECT_SIGN_OUT,
  STRIPE_PUBLIC_KEY: config.STRIPE_PUBLIC_KEY,
  SESSION_EMAIL_KEY: config.SESSION_EMAIL_KEY,
  COOKIE_DOMAIN: config.COOKIE_DOMAIN,
  ENVIRONMENT: config.ENVIRONMENT,
  STAGE: config.STAGE,
});

export default config;