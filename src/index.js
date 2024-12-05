import React from "react";
import './index.css';
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import App from "./App";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_EHz7xWNbm",
  client_id: "64iqduh82e6tvd5orlkn7rktc8",
  redirect_uri: "http://localhost:3000",
  response_type: "code",
  scope: "email openid",
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter> {/* Wrap the app with BrowserRouter */}
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
