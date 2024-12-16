import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      region: process.env.REACT_APP_AWS_REGION,
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_COGNITO_APP_CLIENT_ID,
    },
    cookieStorage: {
      domain: process.env.REACT_APP_COOKIE_DOMAIN, // localhost during development
      path: '/',
      expires: 365,
      sameSite: "strict",
      secure: false
    }
  }
};

console.log("Amplify Config:", awsConfig); // Debugging log to confirm values

Amplify.configure(awsConfig);

export default awsConfig;
