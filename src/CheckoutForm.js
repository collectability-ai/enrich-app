import React, { useState, useEffect } from "react";
import axios from "axios";

const CheckoutForm = ({ userEmail, token }) => {
  console.log("Received userEmail in CheckoutForm:", userEmail);
  console.log("Received token in CheckoutForm:", token);

  const [priceId, setPriceId] = useState("price_1QOv9IAUGHTClvwyzELdaAiQ"); // Default 50-pack
  const [paymentMethodId, setPaymentMethodId] = useState(""); // Selected payment method ID
  const [paymentMethods, setPaymentMethods] = useState([]); // List of available payment methods
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
  const fetchPaymentMethods = async () => {
    if (!userEmail || !token) {
      console.error("User email or token is missing. Please sign in again.");
      return;
    }

    console.log("Fetching payment methods for userEmail:", userEmail);
    console.log("Using token:", token);

    try {
      const response = await axios.post(
        "http://localhost:5000/get-payment-methods",
        { email: userEmail }, // Request body
        {
          headers: {
            Authorization: `Bearer ${token}`, // Token in the headers
          },
        }
      );
      console.log("API Response:", response.data);

      // Handle response (update payment methods in state)
      setPaymentMethods(response.data.paymentMethods || []);
      if (response.data.paymentMethods?.length > 0) {
        setPaymentMethodId(response.data.paymentMethods[0].id); // Default payment method
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error.response?.data || error.message);
    }
  };

  fetchPaymentMethods();
}, [userEmail, token]);


  const handlePurchase = async () => {
    if (!paymentMethodId) {
      setErrorMessage("Please select or add a payment method.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await axios.post(
        "http://localhost:5000/purchase-pack",
        {
          email: userEmail,
          priceId,
          paymentMethodId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccessMessage(
        `Pack purchased successfully! Remaining credits: ${response.data.remainingCredits}`
      );
    } catch (error) {
      const message = error.response?.data?.error?.message || "An error occurred during purchase.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Purchase Credits</h2>
      {loading && <p>Loading...</p>}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <label htmlFor="package">Choose a package:</label>
      <select
        id="package"
        value={priceId}
        onChange={(e) => setPriceId(e.target.value)}
        style={{ marginBottom: "15px", display: "block" }}
      >
        {/* Package options */}
        <option value="price_1QOubIAUGHTClvwyCb4r0ffE">3 credits ($2.00)</option>
        <option value="price_1QOv9IAUGHTClvwyRj2ChIb3">10 credits ($5.97)</option>
        <option value="price_1QOv9IAUGHTClvwyzELdaAiQ">50 credits ($19.97)</option>
        <option value="price_1QOv9IAUGHTClvwyxw7vJURF">150 credits ($49.97)</option>
        <option value="price_1QOv9IAUGHTClvwyMRquKtpG">500 credits ($119.97)</option>
        <option value="price_1QOv9IAUGHTClvwyBH9Jh7ir">1000 credits ($199.97)</option>
        <option value="price_1QOv9IAUGHTClvwykbXsElbr">1750 credits ($279.97)</option>
      </select>

      <label htmlFor="payment-method">Select Payment Method:</label>
      <select
        id="payment-method"
        value={paymentMethodId}
        onChange={(e) => setPaymentMethodId(e.target.value)}
        style={{ marginBottom: "15px", display: "block" }}
      >
        <option value="">-- Select Payment Method --</option>
        {paymentMethods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.brand.toUpperCase()} ending in {method.last4} (Expires {method.exp_month}/
            {method.exp_year})
          </option>
        ))}
      </select>

      <button onClick={handlePurchase} disabled={loading}>
        Purchase
      </button>
    </div>
  );
};

export default CheckoutForm;
