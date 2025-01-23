import React from "react";
import logger from './logger';
import "./index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import './aws-config';  // Amplify configuration is centralized here
import App from "./App";

// Debug logs for environment variables
logger.log('Environment:', process.env.REACT_APP_ENVIRONMENT);
logger.log('Region:', process.env.REACT_APP_AWS_REGION);
logger.log('User Pool ID:', process.env.REACT_APP_USER_POOL_ID);

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App/>
    </BrowserRouter>
  </React.StrictMode>
);
