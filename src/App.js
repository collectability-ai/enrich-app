import React from "react";
import { Amplify } from "aws-amplify";
import { withAuthenticator, Button } from "@aws-amplify/ui-react";
import awsconfig from "./aws-exports";
import Form from "./Form"; // Import the Form component

Amplify.configure(awsconfig);

const App = ({ signOut, user }) => {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1 style={{ color: "red" }}>Enrich and Validate</h1>
      <p>Welcome, {user.attributes?.email || "User"}</p>
      <Button onClick={signOut} style={{ marginTop: "20px" }}>
        Log Out
      </Button>

      {/* Render the Form Component */}
      <Form />
    </div>
  );
};

export default withAuthenticator(App);
