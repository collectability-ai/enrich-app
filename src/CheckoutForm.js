import React, { useState, useEffect } from "react";
import axios from "axios";

const CheckoutForm = ({ userEmail, token }) => {
  console.log("Received userEmail in CheckoutForm:", userEmail);
  console.log("Received token in CheckoutForm:", token);

  const [priceId, setPriceId] = useState("price_1QOv9IAUGHTClvwyzELdaAiQ"); // Default 50-pack
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!userEmail || !token) {
        console.error("User email or token is missing. Please sign in again.");
        return;
      }

      try {
        const response = await axios.post(
          "http://localhost:5000/get-payment-methods",
          { email: userEmail },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        setPaymentMethods(response.data.paymentMethods || []);
        if (response.data.paymentMethods?.length > 0) {
          setPaymentMethodId(response.data.paymentMethods[0].id);
        }
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        setErrorMessage("Failed to load payment methods. Please refresh the page.");
      }
    };

    fetchPaymentMethods();
  }, [userEmail, token]);

  // Function to verify credits were added
  const verifyCredits = async (initialCredits, maxAttempts = 3) => {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await axios.post(
          "http://localhost:5000/check-credits",
          { email: userEmail },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.data.credits > initialCredits) {
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
        attempts++;
      } catch (error) {
        console.error("Error verifying credits:", error);
      }
    }
    return false;
  };

  const handlePurchase = async () => {
    if (!paymentMethodId) {
      setErrorMessage("Please select or add a payment method.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Get initial credit balance
      const initialCreditsResponse = await axios.post(
        "http://localhost:5000/check-credits",
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const initialCredits = initialCreditsResponse.data.credits || 0;

      // Process purchase
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

      // Handle case where payment processed but verification is needed
      if (response.data.requiresVerification) {
        setVerifying(true);
        setSuccessMessage("Payment processed. Verifying credit update...");
        
        const verified = await verifyCredits(initialCredits);
        if (!verified) {
          setSuccessMessage(
            "Payment successful! Credits may take a few minutes to appear. " +
            "Please refresh the page in a few minutes."
          );
        } else {
          setSuccessMessage(
            `Purchase successful! Your new balance is ${response.data.remainingCredits} credits.`
          );
        }
      } else {
        setSuccessMessage(
          `Purchase successful! You now have ${response.data.remainingCredits} credits.`
        );
      }

    } catch (error) {
      console.error("Purchase error:", error);
      
      // Handle specific error cases
      if (error.response?.data?.error?.requiresSupport) {
        setErrorMessage(
          "Your payment was processed but there was a delay adding credits. " +
          "Our support team has been notified and will resolve this shortly."
        );
      } else if (error.response?.data?.error?.code === 'card_declined') {
        setErrorMessage("Your card was declined. Please try a different payment method.");
      } else {
        setErrorMessage(error.response?.data?.error?.message || "An error occurred during purchase.");
      }
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <div>
      <h2>Purchase Credits</h2>
      {loading && <p>Processing your purchase...</p>}
      {verifying && <p>Verifying credit update...</p>}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <label htmlFor="package">Choose a package:</label>
      <select
        id="package"
        value={priceId}
        onChange={(e) => setPriceId(e.target.value)}
        style={{ marginBottom: "15px", display: "block" }}
        disabled={loading || verifying}
      >
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
        disabled={loading || verifying}
      >
        <option value="">-- Select Payment Method --</option>
        {paymentMethods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.brand.toUpperCase()} ending in {method.last4} (Expires {method.exp_month}/
            {method.exp_year})
          </option>
        ))}
      </select>

      <button 
        onClick={handlePurchase} 
        disabled={loading || verifying || !paymentMethodId}
      >
        {loading || verifying ? "Processing..." : "Purchase"}
      </button>
    </div>
  );
};

export default CheckoutForm;