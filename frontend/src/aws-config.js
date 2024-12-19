import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      region: process.env.REACT_APP_AWS_REGION,
      userPoolId: process.env.REACT_APP_USER_POOL_ID,         // Changed from COGNITO_USER_POOL_ID
      userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,  // Changed from COGNITO_APP_CLIENT_ID
      identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    },
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

console.log("Amplify Config:", awsConfig); // We'll keep this debug log for now

Amplify.configure(awsConfig);

export default awsConfig;