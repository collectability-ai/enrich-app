import { Amplify } from 'aws-amplify';

// Debug log all environment variables
console.log('Environment Check:', {
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'NOT SET',
  REGION: process.env.REACT_APP_AWS_REGION || 'NOT SET',
  USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID || 'NOT SET',
  USER_POOL_WEB_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 'NOT SET',
  IDENTITY_POOL_ID: process.env.REACT_APP_IDENTITY_POOL_ID || 'NOT SET',
  AUTH_DOMAIN: process.env.REACT_APP_AUTH_DOMAIN || 'NOT SET',
  REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN || 'NOT SET',
  REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'NOT SET',
  COOKIE_DOMAIN: process.env.REACT_APP_COOKIE_DOMAIN || 'NOT SET'
});

// Create config object first so we can inspect it
const awsConfig = {
  Auth: {
    mandatorySignIn: true,
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    oauth: {
      domain: process.env.REACT_APP_AUTH_DOMAIN,
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN,
      redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT,
      responseType: 'code'
    },
    cookieStorage: {
      domain: process.env.REACT_APP_COOKIE_DOMAIN,
      path: '/',
      expires: 365,
      sameSite: "strict",
      secure: process.env.REACT_APP_ENVIRONMENT === 'production'
    }
  }
};

// Log the complete configuration before applying it
console.log('Auth Configuration:', {
  region: awsConfig.Auth.region,
  userPoolId: awsConfig.Auth.userPoolId,
  userPoolWebClientId: awsConfig.Auth.userPoolWebClientId,
  identityPoolId: awsConfig.Auth.identityPoolId,
  authDomain: awsConfig.Auth.oauth.domain,
  cookieDomain: awsConfig.Auth.cookieStorage.domain
});

// Check for missing required values before configuring
if (!awsConfig.Auth.userPoolId || !awsConfig.Auth.userPoolWebClientId) {
  console.error('Critical Auth Configuration Missing:', {
    userPoolId: awsConfig.Auth.userPoolId ? 'SET' : 'MISSING',
    userPoolWebClientId: awsConfig.Auth.userPoolWebClientId ? 'SET' : 'MISSING'
  });
}

Amplify.configure(awsConfig);

export default awsConfig;