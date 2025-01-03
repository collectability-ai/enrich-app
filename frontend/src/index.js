import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import './aws-config';  // Amplify configuration is centralized here
import App from "./App";

// Debug logs for environment variables
console.log('Environment:', process.env.REACT_APP_ENVIRONMENT);
console.log('Region:', process.env.REACT_APP_AWS_REGION);
console.log('User Pool ID:', process.env.REACT_APP_USER_POOL_ID);

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App/>
    </BrowserRouter>
  </React.StrictMode>
);
