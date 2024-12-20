import { Amplify } from 'aws-amplify';

// Debug log all environment variables
console.log('Environment Variables:', {
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
  REGION: process.env.REACT_APP_AWS_REGION,
  USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID,
  USER_POOL_WEB_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
  IDENTITY_POOL_ID: process.env.REACT_APP_IDENTITY_POOL_ID,
  AUTH_DOMAIN: process.env.REACT_APP_AUTH_DOMAIN,
  REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN,
  REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT,
  COOKIE_DOMAIN: process.env.REACT_APP_COOKIE_DOMAIN
});

const awsConfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    mandatorySignIn: true,
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

console.log('AWS Config:', awsConfig);

Amplify.configure(awsConfig);

export default awsConfig;