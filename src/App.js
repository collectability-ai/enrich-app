import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Amplify } from "aws-amplify";
import { withAuthenticator, Button } from "@aws-amplify/ui-react";
import awsconfig from "./aws-exports";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "./CheckoutForm";
import InputForm from "./InputForm";
import Dashboard from "./Dashboard"; // Combines CreditsRemaining and SearchHistory
import axios from "axios"; // Import axios for HTTP requests

Amplify.configure(awsconfig);

const stripePromise = loadStripe(
  "pk_test_51MjjjZAUGHTClvwysxBzvOL23fSDEGZcXqjogH5LDGAQcqRgBXQAljU4zBE0gxTaxUVI6dTgXDssKfl7nfRi9xcd00XlLSh1Qh"
);

const App = ({ signOut, user }) => {
  // Extract logged-in user's email
  const userEmail = user?.signInDetails?.loginId || "Unknown User";

  // Debugging log for the full user object
  useEffect(() => {
    console.log("Full User Object:", JSON.stringify(user, null, 2));
    console.log("Extracted Email:", userEmail);

    // Test axios integration (optional: remove this after confirming it works)
    const testAxios = async () => {
      try {
        const response = await axios.post("http://localhost:5000/check-credits", { email: userEmail });
        console.log("Axios Test Response:", response.data);
      } catch (error) {
        console.error("Axios Test Error:", error.response?.data || error.message);
      }
    };

    testAxios();
  }, [user, userEmail]);

  return (
    <Router>
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h1 style={{ color: "red" }}>Enrich and Validate</h1>
        <p>Welcome, {userEmail}</p>
        <Button onClick={signOut} style={{ marginTop: "20px" }}>
          Log Out
        </Button>

        {/* Navigation Links */}
        <div style={{ marginTop: "20px" }}>
          <Link to="/" style={{ margin: "10px", textDecoration: "none" }}>
            <Button>Dashboard</Button>
          </Link>
          <Link to="/form" style={{ margin: "10px", textDecoration: "none" }}>
            <Button>Search Form</Button>
          </Link>
          <Link to="/purchase-pack" style={{ margin: "10px", textDecoration: "none" }}>
            <Button>Purchase Pack</Button>
          </Link>
        </div>

        <Routes>
          {/* Dashboard route */}
          <Route path="/" element={<Dashboard userEmail={userEmail} />} />

          {/* Route for the form to perform searches */}
          <Route path="/form" element={<InputForm userEmail={userEmail} />} />

          {/* Route for purchasing pre-paid blocks */}
          <Route
            path="/purchase-pack"
            element={
              <Elements stripe={stripePromise}>
                <CheckoutForm userEmail={userEmail} />
              </Elements>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default withAuthenticator(App);
