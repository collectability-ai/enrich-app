import React from 'react';

const EnvTest = () => {
  return (
    <div>
      <h2>Environment Variables Test</h2>
      <p>REACT_APP_AWS_REGION: {process.env.REACT_APP_AWS_REGION}</p>
      <p>REACT_APP_COGNITO_USER_POOL_ID: {process.env.REACT_APP_COGNITO_USER_POOL_ID}</p>
      <p>REACT_APP_USER_POOL_WEB_CLIENT_ID: {process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID}</p>
      <p>REACT_APP_COGNITO_IDENTITY_POOL_ID: {process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID}</p>
      <p>REACT_APP_COGNITO_AUTHORITY: {process.env.REACT_APP_COGNITO_AUTHORITY}</p>
      <p>REACT_APP_REDIRECT_URI: {process.env.REACT_APP_REDIRECT_URI}</p>
      <p>REACT_APP_COOKIE_DOMAIN: {process.env.REACT_APP_COOKIE_DOMAIN}</p>
    </div>
  );
};

export default EnvTest;