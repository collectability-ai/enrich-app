import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchHistory from "./SearchHistory";
import { jwtDecode } from "jwt-decode";
import SuccessModal from './SuccessModal';


const Dashboard = ({ token, email }) => {
  const [userEmail, setUserEmail] = useState(null);
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
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
useEffect(() => {
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      const email = decodedToken.email || decodedToken["cognito:username"];
      setUserEmail(email);
      console.log("Dashboard - setting userEmail:", email);
    } catch (err) {
      console.error("Error decoding token:", err);
    }
  }
}, [token]); // Remove userEmail from dependencies

  // Fetch Remaining Credits
  useEffect(() => {
  let isMounted = true;

  const fetchCredits = async () => {
    if (!userEmail) {
      console.log("No email available for credits fetch");
      return;
    }

    setLoadingCredits(true);
    setCreditsError(null);

    try {
      console.log("Fetching credits for user:", userEmail);
      const response = await axios.post(
        "http://localhost:5000/check-credits",
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (isMounted) {
        setRemainingCredits(response.data.credits);
        console.log("Credits fetched successfully:", response.data.credits);
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

  return () => {
    isMounted = false;
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
  if (!paymentMethods || !paymentMethods.length) {
    await handleStripeCheckout();
    return;
  }

  setProcessing(true);
  try {
    const response = await axios.post(
      "http://localhost:5000/purchase-pack",
      {
        email: userEmail,
        priceId: "price_1QOv9IAUGHTClvwyzELdaAiQ", // 50 credits pack
        paymentMethodId: paymentMethods[0].id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setRemainingCredits(response.data.remainingCredits);
    setShowPopup(false);
    setShowSuccessModal(true);

  } catch (error) {
    console.error("Error processing purchase:", error);
    const errorMessage = error.response?.data?.error?.message;
    
    // Handle declined/expired cards
    if (error.response?.data?.error?.code === 'card_declined' || 
        errorMessage?.includes('declined') || 
        errorMessage?.includes('expired')) {
      setError("Your card was declined. Redirecting to checkout to update payment method.");
      setShowPopup(false);
      setTimeout(async () => {
        await handleStripeCheckout();
      }, 2000);
    } else {
      setError(errorMessage || "Failed to complete purchase. Please try again.");
    }
  } finally {
    setProcessing(false);
  }
};
const handleStripeCheckout = async () => {
  try {
    console.log('Initiating Stripe checkout for:', userEmail);
    const response = await axios.post(
      "http://localhost:5000/create-checkout-session",
      { 
        email: userEmail,
        priceId: "price_1QOv9IAUGHTClvwyzELdaAiQ" // 50 credits pack
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Checkout session created:', response.data);
    
    if (response.data.url) {
      window.location.href = response.data.url;
    } else {
      throw new Error('No checkout URL received');
    }
  } catch (error) {
    console.error("Error initiating checkout:", error);
    if (error.response?.data?.details) {
      console.error("Server error details:", error.response.data.details);
    }
    alert("Failed to initiate checkout. Please try again.");
  }
};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">Dashboard</h2>

      {/* Top Row Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Credits Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Remaining Credits</h3>
          <div className="min-h-[80px] flex items-center justify-center">
            {loadingCredits ? (
              <p className="text-gray-500">Loading...</p>
            ) : creditsError ? (
              <p className="text-red-600">{creditsError}</p>
            ) : (
              <p className="text-3xl font-bold text-gray-800">
                {remainingCredits !== null ? remainingCredits : "N/A"}
              </p>
            )}
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment Method</h3>
          <div className="min-h-[80px] flex items-center justify-center">
            {loadingPayments ? (
              <p className="text-gray-500">Loading...</p>
            ) : paymentsError ? (
              <p className="text-red-600">{paymentsError}</p>
            ) : !paymentMethods || paymentMethods.length === 0 ? (
              <p className="text-gray-500">No payment methods available.</p>
            ) : !paymentMethods[0]?.brand || !paymentMethods[0]?.last4 ? (
              <p className="text-gray-500">Payment method information unavailable</p>
            ) : (
              <div className="text-center">
                <p className="text-gray-800 font-medium">
                  {paymentMethods[0].brand} •••• {paymentMethods[0].last4}
                </p>
                {paymentMethods[0].exp_month && paymentMethods[0].exp_year && (
                  <p className="text-sm text-gray-500 mt-1">
                    Expires {paymentMethods[0].exp_month}/{paymentMethods[0].exp_year}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Buy Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Buy 50 Credits</h3>
          <div className="min-h-[80px] flex items-center justify-center">
            <button
              onClick={() => {
                if (paymentMethods?.length > 0) {
                  setShowPopup(true);
                } else {
                  handleStripeCheckout();
                }
              }}
              disabled={processing}
              className={`px-6 py-3 rounded-md text-white font-medium transition-colors
                ${processing 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
            >
              {processing ? "Processing..." : "Purchase"}
            </button>
          </div>
        </div>
      </div>

      {/* Purchase History Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Purchase History</h3>
        
        {loadingHistory ? (
          <p className="text-gray-500">Loading purchase history...</p>
        ) : historyError ? (
          <p className="text-red-600">{historyError}</p>
        ) : purchaseHistory.length === 0 ? (
          <p className="text-gray-500">No purchase history available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(isExpanded ? purchaseHistory : purchaseHistory.slice(0, 3)).map((purchase, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">{purchase.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{purchase.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {purchaseHistory.length > 3 && (
          <div className="mt-4 text-right">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-4 py-2 rounded-md text-white font-medium text-sm
                ${isExpanded 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
            >
              {isExpanded ? "Collapse" : "Expand All"}
            </button>
          </div>
        )}
      </div>

      {/* Search History Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {userEmail && <SearchHistory userEmail={userEmail} token={token} />}
      </div>

     {/* Confirmation Modal */}
{showPopup && paymentMethods && paymentMethods[0] && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
      <h3 className="text-xl font-semibold mb-4">Confirm Purchase</h3>
      <p className="text-gray-600 mb-6">
        You are about to purchase <span className="font-medium text-gray-800">50 credits for $19.97</span>
        <br />
        using <span className="font-medium text-gray-800">{paymentMethods[0].brand} •••• {paymentMethods[0].last4}</span>
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleQuickBuy}
          disabled={processing}
          className={`flex-1 px-4 py-2 rounded-md text-white font-medium transition-colors inline-flex items-center justify-center gap-2 
            ${processing 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
        >
          {processing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            "Confirm"
          )}
        </button>
        <button
          onClick={() => setShowPopup(false)}
          disabled={processing}
          className="flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md font-medium transition-colors"
        >
          Cancel
       </button>
      </div>
    </div>
  </div>
)}

{/* Success Modal */}
<SuccessModal 
  isOpen={showSuccessModal} 
  onClose={() => setShowSuccessModal(false)} 
/>
    </div>
  );
};

export default Dashboard;