import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchHistory from "./SearchHistory";
import { jwtDecode } from "jwt-decode";


const Dashboard = ({ token }) => {
  const [userEmail, setUserEmail] = useState(null); // Add this state
  console.log("Dashboard - userEmail:", userEmail); // Debug userEmail
  console.log("Dashboard - token:", token); // Debug token
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [creditsError, setCreditsError] = useState(null);
  const [paymentsError, setPaymentsError] = useState(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // For the confirmation popup
  const [processing, setProcessing] = useState(false); // For purchase in progress
  const [purchaseHistory, setPurchaseHistory] = useState([]); // To store purchase data
  const [loadingHistory, setLoadingHistory] = useState(false); // For loading indicator
  const [historyError, setHistoryError] = useState(null); // To store error messages
  const [isExpanded, setIsExpanded] = useState(false); // To manage collapsible state

useEffect(() => {
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      const email = decodedToken.email || decodedToken["cognito:username"];
      setUserEmail(email);
      console.log("Dashboard - setting userEmail:", email); // Debug log
    } catch (err) {
      console.error("Error decoding token:", err);
    }
  }
}, [userEmail, token]); // Include both dependencies

  // Fetch Remaining Credits
  useEffect(() => {
  let isMounted = true;

  const fetchCredits = async () => {
    setLoadingCredits(true);
    setCreditsError(null);
    setRemainingCredits(null); // Clear credits immediately when effect runs

    if (!userEmail) {
      console.log("No user email available for credits fetch");
      return;
    }

    try {
      console.log("Fetching credits for user:", userEmail);
      const response = await axios.post(
        "http://localhost:5000/check-credits",
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (isMounted) {
        setRemainingCredits(response.data.credits);
      }
    } catch (err) {
      if (isMounted) {
        console.error("Error fetching remaining credits:", err);
        setCreditsError("Failed to fetch remaining credits.");
      }
    } finally {
      if (isMounted) {
        setLoadingCredits(false);
      }
    }
  };

  fetchCredits();

  // Cleanup function
  return () => {
    isMounted = false;
    setRemainingCredits(null);
    setCreditsError(null);
  };
}, [userEmail, token]);

  // Fetch Payment Methods
useEffect(() => {
  let isMounted = true;

  const fetchPaymentMethods = async () => {
    setLoadingPayments(true);
    setPaymentsError(null);
    setPaymentMethods([]); // Clear immediately when effect runs

    if (!userEmail) {
      console.log("No user email available yet");
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

      if (isMounted) {
        setPaymentMethods(response.data.paymentMethods || []);
      }
    } catch (err) {
      if (isMounted) {
        console.error("Error fetching payment methods:", err);
        setPaymentsError("Unable to load payment methods.");
      }
    } finally {
      if (isMounted) {
        setLoadingPayments(false);
      }
    }
  };

  fetchPaymentMethods();

  // Cleanup function
  return () => {
    isMounted = false;
    setPaymentMethods([]);
    setPaymentsError(null);
  };
}, [token, userEmail]);


 // Fetch Purchase History
useEffect(() => {
  let isMounted = true;

  const fetchPurchaseHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    setPurchaseHistory([]); // Clear immediately when effect runs

    if (!userEmail) {
      console.log("No user email available yet");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/get-purchase-history",
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (isMounted) {
        const data = response.data;
        const formattedHistory = (data.history || []).map((purchase) => ({
          date: purchase.date || "N/A",
          amount: purchase.amount ? `$${purchase.amount.toFixed(2)}` : "N/A",
        }));

        setPurchaseHistory(formattedHistory);
      }
    } catch (err) {
      if (isMounted) {
        console.error("Error fetching purchase history:", err);
        setHistoryError("Unable to load purchase history.");
      }
    } finally {
      if (isMounted) {
        setLoadingHistory(false);
      }
    }
  };

  fetchPurchaseHistory();

  // Cleanup function
  return () => {
    isMounted = false;
    setPurchaseHistory([]);
    setHistoryError(null);
  };
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

  {/* Purchase History Section */}
<div
  style={{
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  }}
>
  <h3 style={{ textAlign: "center", marginBottom: "10px" }}>Purchase History</h3>

  {loadingHistory ? (
    <p>Loading purchase history...</p>
  ) : historyError ? (
    <p style={{ color: "red" }}>{historyError}</p>
  ) : purchaseHistory.length === 0 ? (
    <p>No purchase history available.</p>
  ) : (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "10px",
      }}
    >
      <thead>
        <tr style={{ backgroundColor: "#f2f2f2" }}>
          <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #ddd" }}>
            Date
          </th>
          <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #ddd" }}>
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {(isExpanded ? purchaseHistory : purchaseHistory.slice(0, 3)).map(
          (purchase, index) => (
            <tr key={index}>
              <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                {purchase.date}
              </td>
              <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                {purchase.amount}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  )}

  {purchaseHistory.length > 3 && (
    <div style={{ textAlign: "right" }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "8px 16px",
          backgroundColor: isExpanded ? "#dc3545" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        {isExpanded ? "Collapse" : "Expand All"}
      </button>
    </div>
  )}
</div>


     {/* Search History Section */}
<div
  style={{
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  }}
>
  {userEmail && <SearchHistory userEmail={userEmail} token={token} />}
</div>
    </div>
  );
};

export default Dashboard;
