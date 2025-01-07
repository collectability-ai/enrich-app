// src/config.js

// Load environment variables from process.env
const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '', // Use environment variable for API Base URL
  API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT || `${process.env.REACT_APP_API_BASE_URL}/api`, // Derive endpoint from base URL

  // AWS Amplify Configuration
  AWS_REGION: process.env.REACT_APP_AWS_REGION || 'us-east-2', // Amplify region (default to 'us-east-2')
  USER_POOL_ID: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'us-east-2_EHz7xWNbm', // Cognito User Pool ID (fallback to default)
  USER_POOL_WEB_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '4gscq7ph13fjd9vu15comd6gcs', // Cognito User Pool Web Client ID (fallback to default)
  IDENTITY_POOL_ID: process.env.REACT_APP_IDENTITY_POOL_ID || 'us-east-2:f9c3a654-2df9-49fb-8161-09cbc0c58634', // Cognito Identity Pool ID (fallback to default)

  // Authentication Configuration
  AUTH_DOMAIN: process.env.REACT_APP_AUTH_DOMAIN || '', // Cognito Auth Domain
  REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN || '', // Redirect for sign-in
  REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT || '', // Redirect for sign-out

  // Stripe Configuration
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLIC_KEY || '', // Stripe public key

  // Session Management
  SESSION_EMAIL_KEY: process.env.REACT_APP_SESSION_EMAIL_KEY || 'pendingVerificationEmail', // Session key for email
  COOKIE_DOMAIN: process.env.REACT_APP_COOKIE_DOMAIN || '', // Cookie domain for environment

  // Environment
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development', // Current environment
  STAGE: process.env.REACT_APP_STAGE || 'dev', // Current stage
};

// Debug Logging for AWS Amplify Configuration
console.log("AWS Amplify Configuration Debug:", {
  AWS_REGION: config.AWS_REGION,
  USER_POOL_ID: config.USER_POOL_ID,
  USER_POOL_WEB_CLIENT_ID: config.USER_POOL_WEB_CLIENT_ID,
  IDENTITY_POOL_ID: config.IDENTITY_POOL_ID,
});

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

console.log("Injected Redirect Environment Variables:", {
  REACT_APP_REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN,
  REACT_APP_REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT,
});

// Export the configuration for use throughout the app
export default config;
