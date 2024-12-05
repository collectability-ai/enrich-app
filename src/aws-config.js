import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      region: 'us-east-2',
      userPoolId: 'us-east-2_EHz7xWNbm', // Replace with your actual User Pool ID
      userPoolClientId: '64iqduh82e6tvd5orlkn7rktc8', // Your App Client ID
      signUpVerificationMethod: 'code', // or 'link'
    },
    cookieStorage: {
      domain: 'localhost',
      path: '/',
      expires: 365,
      sameSite: "strict",
      secure: false
    }
  }
};

Amplify.configure(awsConfig);

export default awsConfig;