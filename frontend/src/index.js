import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { BrowserRouter } from "react-router-dom";
import { Amplify } from "aws-amplify"; // Import Amplify
import App from "./App";
import awsConfig from "./aws-config"; // Import AWS Amplify config

// Configure Amplify
Amplify.configure(awsConfig);

// Cognito and environment configurations
const cognitoAuthConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY,
  client_id: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
  redirect_uri: process.env.REACT_APP_REDIRECT_URI,
  response_type: "code",
  scope: "email openid",
};

// Debugging Environment Variables (Optional, remove in production)
if (process.env.NODE_ENV === "development") {
  console.log("Environment Variables:", {
    ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
    COGNITO_AUTHORITY: process.env.REACT_APP_COGNITO_AUTHORITY,
    USER_POOL_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI,
  });
}

// Expose Amplify globally for debugging (Optional)
window.Amplify = Amplify;

// Create root element
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
