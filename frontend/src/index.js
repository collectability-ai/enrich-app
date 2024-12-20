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

// Debug logs - these will help identify if environment variables are properly set
console.log('Environment:', process.env.REACT_APP_ENVIRONMENT);
console.log('Amplify Configuration:', {
  region: process.env.REACT_APP_AWS_REGION,
  userPoolId: process.env.REACT_APP_USER_POOL_ID,
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
  identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN,
  redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT,
  cookieDomain: process.env.REACT_APP_COOKIE_DOMAIN
});

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