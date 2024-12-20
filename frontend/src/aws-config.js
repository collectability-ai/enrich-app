// src/aws-config.js
import { Amplify } from 'aws-amplify';
import config from './config';

const awsConfig = {
  Auth: {
    Cognito: {
      region: config.AWS_REGION,
      userPoolId: config.USER_POOL_ID,
      userPoolClientId: config.USER_POOL_WEB_CLIENT_ID,
      identityPoolId: config.IDENTITY_POOL_ID,
    },
    oauth: {
      domain: config.AUTH_DOMAIN,
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: config.REDIRECT_SIGN_IN,
      redirectSignOut: config.REDIRECT_SIGN_OUT,
      responseType: 'code'
    },
    cookieStorage: {
      domain: config.COOKIE_DOMAIN,
      path: '/',
      expires: 365,
      sameSite: "strict",
      secure: config.ENVIRONMENT === 'production'
    }
  }
};

console.log("Amplify Config:", awsConfig);

Amplify.configure(awsConfig);

export default awsConfig;