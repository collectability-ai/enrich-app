import { Amplify } from 'aws-amplify';
import config from './config/config.testing';  // Import the testing config directly

console.log('Loading configuration:', config);

const awsConfig = {
  Auth: {
    mandatorySignIn: true,
    region: config.aws.region,
    userPoolId: config.aws.userPoolId,
    userPoolWebClientId: config.aws.userPoolWebClientId,
    identityPoolId: config.aws.identityPoolId,
    oauth: {
      domain: config.aws.authDomain,
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: config.auth.redirectSignIn,
      redirectSignOut: config.auth.redirectSignOut,
      responseType: 'code'
    },
    cookieStorage: {
      domain: config.auth.cookieDomain,
      path: '/',
      expires: 365,
      sameSite: "strict",
      secure: config.environment === 'production'
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

Amplify.configure(awsConfig);

export default awsConfig;