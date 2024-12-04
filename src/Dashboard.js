import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchHistory from "./SearchHistory";

const Dashboard = ({ userEmail, token }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [creditsError, setCreditsError] = useState(null);
  const [paymentsError, setPaymentsError] = useState(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // For the confirmation popup
  const [processing, setProcessing] = useState(false); // For purchase in progress

  // Fetch Remaining Credits
  useEffect(() => {
    const fetchCredits = async () => {
      setLoadingCredits(true);
      setCreditsError(null);

      try {
        const response = await axios.post("http://localhost:5000/check-credits", {
          email: userEmail,
        });
        setRemainingCredits(response.data.credits);
      } catch (err) {
        setCreditsError("Failed to fetch remaining credits.");
      } finally {
        setLoadingCredits(false);
      }
    };

    fetchCredits();
  }, [userEmail]);

  // Fetch Payment Methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingPayments(true);
      setPaymentsError(null);

      try {
        const response = await fetch("http://localhost:5000/get-payment-methods", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: userEmail }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch payment methods.");
        }

        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      } catch (err) {
        setPaymentsError("Unable to load payment methods.");
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPaymentMethods();
  }, [token, userEmail]);

 // Handle Quick Buy
const handleQuickBuy = async () => {
  if (!paymentMethods.length) {
    alert("No payment methods found. Please add one.");
    return;
  }

  setProcessing(true);
  try {
    const response = await axios.post("http://localhost:5000/purchase-pack", {
      email: userEmail,
      priceId: "price_1QOv9IAUGHTClvwyzELdaAiQ", // 50 credits pack
      paymentMethodId: paymentMethods[0].id, // Use the first payment method
    });

    const data = response.data;

    if (!response.status === 200) {
      throw new Error(data.error?.message || "Purchase failed.");
    }

    // Update credits immediately after successful purchase
    setRemainingCredits(data.remainingCredits);

    alert("Purchase successful!");
  } catch (error) {
    console.error("Error processing purchase:", error.message);
    alert("Failed to complete purchase. Please try again.");
  } finally {
    setProcessing(false);
    setShowPopup(false); // Close popup
  }
};


  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Dashboard</h2>

      {/* Top Row Boxes */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        {/* Remaining Credits Box */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            backgroundColor: "#e0e0e0",
            color: "#333",
            textAlign: "center",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            height: "150px",
          }}
        >
          <h3>Remaining Credits</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            {loadingCredits
              ? "Loading..."
              : creditsError
              ? creditsError
              : remainingCredits !== null
              ? remainingCredits
              : "N/A"}
          </p>
        </div>

        {/* Payment Methods Box */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            backgroundColor: "#e0e0e0",
            color: "#333",
            textAlign: "center",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            height: "150px",
          }}
        >
          <h3>Payment Method</h3>
          {loadingPayments ? (
            <p>Loading...</p>
          ) : paymentsError ? (
            <p style={{ color: "red" }}>{paymentsError}</p>
          ) : paymentMethods.length === 0 ? (
            <p>No payment methods available.</p>
          ) : (
            <p>
              {paymentMethods[0].brand} ending in {paymentMethods[0].last4}{" "}
              (Expires {paymentMethods[0].exp_month}/{paymentMethods[0].exp_year})
            </p>
          )}
        </div>

        {/* Quick Buy Box */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            backgroundColor: "#e0e0e0",
            color: "#333",
            textAlign: "center",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            height: "150px",
          }}
        >
          <h3>Quick Buy 50 Credits</h3>
          <button
            onClick={() => setShowPopup(true)} // Open popup
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
            }}
            disabled={processing}
          >
            Purchase
          </button>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
          }}
        >
          <p>
            You are about to purchase <strong>50 credits</strong> using{" "}
            <strong>
              {paymentMethods[0].brand} ending in {paymentMethods[0].last4}
            </strong>
            . Do you want to proceed?
          </p>
          <button
            onClick={handleQuickBuy}
            style={{
              padding: "10px 20px",
              marginRight: "10px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            disabled={processing}
          >
            {processing ? "Processing..." : "Confirm"}
          </button>
          <button
            onClick={() => setShowPopup(false)} // Close popup
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Search History */}
      <div style={{ marginTop: "30px" }}>
        <SearchHistory userEmail={userEmail} />
      </div>
    </div>
  );
};

export default Dashboard;
