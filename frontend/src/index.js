import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Amplify } from 'aws-amplify';
import App from "./App";

// Configure Amplify directly here instead of importing from aws-config
const amplifyConfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID,
    loginWith: {
      username: true,
      email: true
    },
    oauth: {
      domain: process.env.REACT_APP_COGNITO_AUTHORITY,
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || process.env.REACT_APP_REDIRECT_URI,
      redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || process.env.REACT_APP_REDIRECT_URI,
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

// Debug logs - these will help identify if environment variables are properly set
console.log('Environment:', process.env.REACT_APP_ENVIRONMENT);
console.log('Region:', process.env.REACT_APP_AWS_REGION);
console.log('User Pool ID:', process.env.REACT_APP_COGNITO_USER_POOL_ID);
console.log('User Pool Web Client ID:', process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID);
console.log('Identity Pool ID:', process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID);
console.log('Auth Domain:', process.env.REACT_APP_COGNITO_AUTHORITY);
console.log('Redirect Sign In:', process.env.REACT_APP_REDIRECT_SIGN_IN);
console.log('Redirect Sign Out:', process.env.REACT_APP_REDIRECT_SIGN_OUT);
console.log('Redirect URI:', process.env.REACT_APP_REDIRECT_URI);
console.log('Cookie Domain:', process.env.REACT_APP_COOKIE_DOMAIN);
console.log('Full Amplify Config:', amplifyConfig);

Amplify.configure(amplifyConfig);

// Expose Amplify globally for debugging (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  window.Amplify = Amplify;
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);