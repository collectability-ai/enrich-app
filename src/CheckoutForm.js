import React, { useState, useEffect } from "react";

const CheckoutForm = ({ userEmail }) => {
  const [priceId, setPriceId] = useState("price_1QOv9IAUGHTClvwyzELdaAiQ");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchPaymentMethods();
  }, [userEmail]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
        credentials: 'include'  // Important: Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      setErrorMessage("Failed to load payment methods");
    }
  };

const handlePurchase = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      console.log("Starting purchase with payment methods:", paymentMethods);
      
      // Check for payments and default method
      const defaultMethod = paymentMethods.find(method => method.isDefault);
      console.log("Default payment method found:", defaultMethod);
      
      // Log all payment methods and their default status
      paymentMethods.forEach(method => {
        console.log(`Payment Method ${method.last4}:`, {
          id: method.id,
          isDefault: method.isDefault,
          brand: method.brand
        });
      });
      
      if (!defaultMethod) {
        console.log("No default method found - checking total payment methods:", paymentMethods.length);
        if (paymentMethods.length === 0) {
          console.log("No payment methods - redirecting to Stripe Checkout");
          // ... Stripe Checkout code ...
        } else {
          setErrorMessage("Please set a default payment method before making a purchase.");
          return;
        }
      }

      // Log the purchase request before sending
      const purchasePayload = {
        email: userEmail,
        priceId,
        paymentMethodId: defaultMethod.id
      };
      console.log("Sending purchase request:", {
        url: `${process.env.REACT_APP_API_BASE_URL}/purchase-pack`,
        payload: purchasePayload,
      });

      const purchaseResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/purchase-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add token to headers
        },
        body: JSON.stringify(purchasePayload),
        credentials: 'include'
      });

      console.log("Purchase response status:", purchaseResponse.status);
      const responseData = await purchaseResponse.json();
      console.log("Purchase response data:", responseData);

      if (!purchaseResponse.ok) {
        throw new Error(responseData.error?.message || 'Purchase failed');
      }

      setSuccessMessage(`Purchase successful! You now have ${responseData.remainingCredits} credits.`);
    } catch (error) {
      console.error("Purchase error details:", {
        message: error.message,
        stack: error.stack,
        paymentMethods: paymentMethods,
        defaultMethod: paymentMethods.find(method => method.isDefault)
      });
      setErrorMessage(error.message || "An error occurred during purchase");
    } finally {
      setLoading(false);
    }
};

  return (
    <div>
      <h2>Purchase Credits</h2>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="package">Choose a package:</label>
        <select
          id="package"
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
          disabled={loading}
          style={{ marginLeft: "10px" }}
        >
          <option value="price_1QOubIAUGHTClvwyCb4r0ffE">3 credits ($2.00)</option>
          <option value="price_1QOv9IAUGHTClvwyRj2ChIb3">10 credits ($5.97)</option>
          <option value="price_1QOv9IAUGHTClvwyzELdaAiQ">50 credits ($19.97)</option>
          <option value="price_1QOv9IAUGHTClvwyxw7vJURF">150 credits ($49.97)</option>
          <option value="price_1QOv9IAUGHTClvwyMRquKtpG">500 credits ($119.97)</option>
          <option value="price_1QOv9IAUGHTClvwyBH9Jh7ir">1000 credits ($199.97)</option>
          <option value="price_1QOv9IAUGHTClvwykbXsElbr">1750 credits ($279.97)</option>
        </select>
      </div>

      {paymentMethods.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          {paymentMethods.find(method => method.isDefault) ? (
            <p>Using default payment method: {
              paymentMethods.find(method => method.isDefault).brand.toUpperCase()} ending in {
              paymentMethods.find(method => method.isDefault).last4}
            </p>
          ) : (
            <p style={{ color: "red" }}>Please set a default payment method before making a purchase.</p>
          )}
        </div>
      )}

      <button 
        onClick={handlePurchase}
        disabled={loading || (paymentMethods.length > 0 && !paymentMethods.find(method => method.isDefault))}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: (loading || (paymentMethods.length > 0 && !paymentMethods.find(method => method.isDefault))) ? 0.7 : 1
        }}
      >
        {loading ? "Processing..." : paymentMethods.length > 0 ? "Purchase" : "Proceed to Checkout"}
      </button>

      {process.env.REACT_APP_ENVIRONMENT !== 'production' && (
        <div style={{ marginTop: "20px", color: "#666", fontSize: "0.9em" }}>
          Testing Environment - No real charges will be made
        </div>
      )}
    </div>
  );
};

export default CheckoutForm;