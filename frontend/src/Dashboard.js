import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchHistory from "./SearchHistory";
import { jwtDecode } from "jwt-decode";
import SuccessModal from './SuccessModal';
import logger from './logger';
import config from './config';

const Dashboard = ({ token, email }) => {
  // State declarations
  const [userEmail, setUserEmail] = useState(null);
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [creditsError, setCreditsError] = useState(null);
  const [paymentsError, setPaymentsError] = useState(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ show: false, paymentMethodId: null, cardInfo: null });
  const [error, setError] = useState(null);

  // Token decoding effect
  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const email = decodedToken.email || decodedToken["cognito:username"];
        if (email) {
          setUserEmail(email);
        }
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
  }, [token]);

// Define the fetchCredits function outside the useEffect
const fetchCredits = async (forceFetch = false) => {
  // Exit early if userEmail is not set, and forceFetch is not true
  if (!userEmail && !forceFetch) return;

  setLoadingCredits(true);
  setCreditsError(null);

  try {
    // Make the API call to fetch credits
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/check-credits`,
      { email: userEmail },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Update state with the fetched credits
    setRemainingCredits(response.data.credits);
  } catch (err) {
    // Handle errors and set error messages
    setCreditsError("Failed to fetch remaining credits.");
    console.error("Error fetching credits:", err);
  } finally {
    // Reset loading state
    setLoadingCredits(false);
  }
};

// Credits fetch effect
useEffect(() => {
  let isMounted = true;

  const fetchCreditsWrapper = async () => {
    if (isMounted) {
      await fetchCredits();
    }
  };

  // Call fetchCredits when the component mounts
  fetchCreditsWrapper();

  // Cleanup to avoid state updates on unmounted component
  return () => {
    isMounted = false;
  };
}, [userEmail, token]);



  // Payment methods fetch effect
  useEffect(() => {
    let isMounted = true;

    const fetchPaymentMethods = async () => {
      if (!userEmail) return;

      setLoadingPayments(true);
      setPaymentsError(null);

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`,
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
          setPaymentsError("Unable to load payment methods.");
        }
      } finally {
        if (isMounted) {
          setLoadingPayments(false);
        }
      }
    };

    fetchPaymentMethods();
    return () => { isMounted = false; };
  }, [token, userEmail]);

  // Purchase history fetch effect
  useEffect(() => {
    let isMounted = true;

    const fetchPurchaseHistory = async () => {
      if (!userEmail) return;

      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/get-purchase-history`,
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
            description: purchase.description || "N/A",
            credits: purchase.credits,
            amount: purchase.isFree ? "Free" : `$${purchase.amount.toFixed(2)}`,
          }));
          setPurchaseHistory(formattedHistory);
        }
      } catch (err) {
        if (isMounted) {
          setHistoryError("Unable to load purchase history.");
        }
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    fetchPurchaseHistory();
    return () => { isMounted = false; };
  }, [token, userEmail]);

// Handler functions
const handleQuickBuy = async () => {
  try {
    if (!paymentMethods?.length) {
      await handleStripeCheckout("basic50");
      return;
    }

    const defaultPaymentMethod = paymentMethods.find((method) => method.isDefault) || paymentMethods[0];
    if (!defaultPaymentMethod) {
      alert("No default payment method found. Please add a payment method.");
      return;
    }

    setProcessing(true);

    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/purchase-pack`,
      {
        email: userEmail,
        productId: "prod_basic50",
        paymentMethodId: defaultPaymentMethod.id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      // Update the remaining credits directly from the backend response
      const updatedCredits = response.data.remainingCredits;
      setRemainingCredits(updatedCredits);

      // Log the updated credits for debugging
      logger.log("Updated credits:", updatedCredits);
    }

    setShowPopup(false);
    setShowSuccessModal(true);
  } catch (error) {
    setError(error.response?.data?.error?.message || "Quick Buy failed. Please try again.");
  } finally {
    setProcessing(false);
  }
};



const handleStripeCheckout = async () => {
  try {
    const defaultProduct = config.PRODUCT_TO_PRICE_MAP.basic50;
    if (!defaultProduct || !defaultProduct.productId) {
      throw new Error('Default product configuration not found or invalid');
    }

    const response = await axios.post(
      `${config.API_BASE_URL}/create-checkout-session`,
      {
        email: userEmail,
        productId: defaultProduct.productId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.url) {
      window.location.href = response.data.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error("Error initiating Stripe Checkout:", error);
    alert("Failed to initiate checkout. Please try again.");
  }
};


  const handleAddPaymentMethod = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/create-setup-intent`,
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      setPaymentsError('Failed to set up payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/set-default-payment`,
        { paymentMethodId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`,
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (error) {
      setPaymentsError('Failed to set default payment method');
    }
  };

  const handleDelete = async (paymentMethodId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/delete-payment-method`,
        { paymentMethodId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`,
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPaymentMethods(response.data.paymentMethods || []);
      setShowDeleteConfirm({ show: false, paymentMethodId: null, cardInfo: null });
    } catch (error) {
      setPaymentsError('Failed to delete payment method');
    }
  };

// Render component
  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <h2 className="text-2xl font-bold text-center mb-8">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Credits Card */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Remaining Credits</h3>
          <div className="flex-1 flex items-center justify-center">
            {loadingCredits ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67cad8]"></div>
            ) : creditsError ? (
              <p className="text-red-600">{creditsError}</p>
            ) : (
              <p className="text-5xl font-bold text-[#67cad8]">
                {remainingCredits !== null ? remainingCredits : "N/A"}
              </p>
            )}
          </div>
        </div>

        {/* Payment Methods Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Payment Methods</h3>
            {paymentMethods.length < 2 && (
              <button
                onClick={handleAddPaymentMethod}
                className="px-3 py-1 text-sm bg-[#67cad8] hover:bg-[#5ab5c2] text-white rounded-md transition-colors"
              >
                Add Payment
              </button>
            )}
          </div>

          <div className="min-h-[80px]">
            {loadingPayments ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : paymentsError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-red-600">{paymentsError}</p>
              </div>
            ) : !paymentMethods || paymentMethods.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No payment methods available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.id} 
                    className="border border-gray-200 rounded-md p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-gray-800 font-medium capitalize flex items-center gap-2">
                          {method.brand} •••• {method.last4}
                          {method.isDefault && (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-4 w-4 text-[#67cad8]" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          className="px-2 py-1 text-xs bg-[#67cad8] hover:bg-[#5ab5c2] text-white rounded transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Buy Card */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Buy 50 Credits</h3>
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => {
                if (paymentMethods?.length > 0) {
                  setShowPopup(true);
                } else {
                  handleStripeCheckout();
                }
              }}
              disabled={processing}
              className={`w-full sm:w-auto px-6 py-3 rounded-md text-white font-medium transition-colors
                ${processing 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#1e40af] hover:bg-[#1e3a8a]"}`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </span>
              ) : (
                "Purchase"
              )}
            </button>
          </div>
        </div>
      </div>

{/* Purchase History Section */}
<div className="bg-white rounded-lg shadow-md p-6 mb-8">
  <h3 className="text-lg font-semibold text-gray-700 mb-4">Purchase History</h3>
  
  {loadingHistory ? (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67cad8]"></div>
    </div>
  ) : historyError ? (
    <p className="text-red-600 text-center py-4">{historyError}</p>
  ) : purchaseHistory.length === 0 ? (
    <p className="text-gray-500 text-center py-4">No purchase history available.</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Description</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Credits</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {(isExpanded ? purchaseHistory : purchaseHistory.slice(0, 3)).map((purchase, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-700">{purchase.date}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{purchase.description}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{purchase.credits}</td>
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
            ? "bg-gray-500 hover:bg-gray-600" 
            : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
      >
        {isExpanded ? "Show Less" : "Show More"}
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
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
      <h3 className="text-xl font-semibold mb-4">Confirm Purchase</h3>
      <p className="text-gray-600 mb-6">
        You are about to purchase <span className="font-medium text-gray-800">50 credits for $19.97</span>
        <br />
        using <span className="font-medium text-gray-800">
          {paymentMethods.find(m => m.isDefault)?.brand || paymentMethods[0].brand} •••• 
          {paymentMethods.find(m => m.isDefault)?.last4 || paymentMethods[0].last4}
        </span>
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

{/* Delete Confirmation Modal */}
{showDeleteConfirm.show && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
<div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
<h3 className="text-xl font-semibold mb-4">Remove Payment Method</h3>
<p className="text-gray-600">
Are you sure you want to remove this card?
{showDeleteConfirm.cardInfo && (
<span className="block mt-2 font-medium text-gray-800">
{showDeleteConfirm.cardInfo.brand} •••• {showDeleteConfirm.cardInfo.last4}
</span>
)}
</p>
<div className="flex gap-3 mt-6">
<button onClick={() => handleDelete(showDeleteConfirm.paymentMethodId)} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors">Remove</button>
<button onClick={() => setShowDeleteConfirm({ show: false, paymentMethodId: null, cardInfo: null })} className="flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md font-medium transition-colors">Cancel</button>
</div>
</div>
</div>
)}
</div>
);
};

export default Dashboard;