import { Amplify } from 'aws-amplify';
import config from './config';

const awsConfig = {
  Auth: {
    region: config.AWS_REGION,
    userPoolId: config.USER_POOL_ID,
    userPoolClientId: config.USER_POOL_WEB_CLIENT_ID,
    identityPoolId: config.IDENTITY_POOL_ID,
    oauth: {
      domain: config.AUTH_DOMAIN,
      redirectSignIn: config.REDIRECT_SIGN_IN,
      redirectSignOut: config.REDIRECT_SIGN_OUT,
      responseType: 'code',
    },
    cookieStorage: {
      domain: config.COOKIE_DOMAIN,
      path: '/',
      expires: 365,
      sameSite: 'strict',
      secure: config.ENVIRONMENT === 'production',
    },
  },
};

// Consolidated debug logs
console.log("Amplify Config (aws-config.js):", awsConfig);
console.log("Injected Environment Variables (config):", config);

// Configure Amplify
Amplify.configure(awsConfig);

export default awsConfig;
