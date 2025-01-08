import React, { useState, useEffect } from "react";
import SuccessModal from "./SuccessModal";
import config from "./config"; // Ensure price mappings are imported correctly

const PurchaseCredits = ({ userEmail, token }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [error] = useState(null);

  // Define credit packs using config.PRODUCT_TO_PRICE_MAP
const creditPacks = Object.values(config.PRODUCT_TO_PRICE_MAP).map((pack) => ({
  credits: pack.credits,
  price: pack.price,
  productId: pack.productId,
  type: pack.type, // Include the type here
}));



  // Step 1: Fetch the current user's remaining credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        console.log("Fetching remaining credits...");
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/check-credits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: userEmail }),
        });

        if (response.ok) {
          const data = await response.json();
          setRemainingCredits(data.credits);
          console.log("Remaining credits fetched successfully:", data.credits);
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      }
    };

    fetchCredits();
  }, [userEmail, token]);

  // Step 2: Handle the purchase of a credit pack
const handleBuyPack = async (pack) => {
  setSelectedPack(pack);

  try {
    console.log("Starting purchase flow for pack:", pack);

    // Step 2.1: Fetch available payment methods
    console.log("Fetching payment methods...");
    const paymentMethodsResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: userEmail }),
    });

    if (!paymentMethodsResponse.ok) {
      throw new Error("Failed to fetch payment methods.");
    }

    const data = await paymentMethodsResponse.json();
    console.log("Fetched payment methods:", data.paymentMethods);

    // Step 2.2: Handle case where payment methods are available
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      const defaultMethod = data.paymentMethods.find((method) => method.isDefault);
      setPaymentMethod(defaultMethod || data.paymentMethods[0]);
      setShowConfirmModal(true); // Immediately show the modal after setting payment method
    } else {
      // Step 2.3: Handle case where no payment methods are available
      console.log("No payment methods found, creating Stripe Checkout session...");
      await handleStripeCheckout(pack.productId); // Use priceId instead of productId
    }
  } catch (error) {
    console.error("Error processing purchase:", error);
    alert("An error occurred. Please try again.");
  }
};

// Step 3: Confirm the purchase using the selected payment method
const handleConfirmPurchase = async () => {
  if (!selectedPack) {
    alert("No credit pack selected. Please try again.");
    console.error("Error: No selectedPack object provided.");
    return;
  }

  try {
    console.log("Confirming purchase for:", {
      email: userEmail,
      paymentMethodId: paymentMethod?.id,
      productId: selectedPack?.productId, // Reverted to productId
    });

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/purchase-pack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: userEmail,
        paymentMethodId: paymentMethod?.id,
        productId: selectedPack?.productId, // Reverted to productId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to process the purchase.");
    }

    const purchaseData = await response.json();
    console.log("Purchase successful:", purchaseData);

    alert(`Successfully purchased ${selectedPack?.credits} credits!`);
    setShowConfirmModal(false);
  } catch (error) {
    console.error("Error processing purchase:", {
      message: error.message,
      paymentMethod,
      selectedPack,
    });

    alert(`Error: ${error.message || "Failed to process purchase. Please try again."}`);
  } finally {
    setIsProcessing(false);
  }
};

// Step 4: Redirect to Stripe Checkout if no payment methods exist
const handleStripeCheckout = async (productId) => {
  try {
    console.log("Initiating Stripe Checkout for productId:", productId);

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail,
        productId, // Reverted to productId
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create a checkout session.");
    }

    const checkoutData = await response.json();
    console.log("Redirecting to Stripe Checkout:", checkoutData.url);

    window.location.href = checkoutData.url;
  } catch (error) {
    console.error("Error initiating Stripe Checkout:", error);
    alert("An error occurred. Please try again.");
  }
};

// Credit Packs UI code
  const getBannerStyle = (type) => {
    switch (type) {
      case 'premium':
        return {
          backgroundColor: '#214B8C',
          color: 'white',
          content: 'BEST VALUE'
        };
      case 'popular':
        return {
          backgroundColor: '#7AB95C',
          color: 'white',
          content: 'MOST POPULAR'
        };
      default:
        return null;
    }
  };

  const getCardStyle = (type) => {
    switch (type) {
      case 'premium':
        return {
          backgroundColor: '#f0f9ff',
          borderColor: '#67CAD8'
        };
      case 'popular':
        return {
          backgroundColor: '#f8fff4',
          borderColor: '#7AB95C'
        };
      default:
        return {
          backgroundColor: '#f9fafb',
          borderColor: '#e5e7eb'
        };
    }
  };

// After getCardStyle() but before the main return
  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded">
        {error}
      </div>
    );
  }

  if (creditPacks.length === 0) {
    return (
      <div className="p-4 text-yellow-600 bg-yellow-100 rounded">
        Loading credit packages...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ 
        textAlign: "center", 
        marginBottom: "30px",
        fontSize: "24px",
        color: "#111827"
      }}>
        Purchase Credits
      </h2>

      {/* Enhanced Credits Balance Box */}
      <div style={{
        padding: "30px",
        backgroundColor: "#f0f9ff",
        borderRadius: "12px",
        marginBottom: "40px",
        textAlign: "center",
        maxWidth: "400px",
        margin: "0 auto 40px auto",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        border: "2px solid #214B8C",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: "0",
          left: "0",
          backgroundColor: "#214B8C",
          color: "white",
          padding: "4px 16px",
          borderRadius: "0 0 8px 0",
          fontSize: "12px",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 1
        }}>
          AVAILABLE BALANCE
        </div>
        <h3 style={{ 
          fontSize: "24px",
          fontWeight: "bold",
          color: "#214B8C",
          marginTop: "10px",
          marginBottom: "16px"
        }}>
          Current Credits
        </h3>
        <p style={{ 
          fontSize: "36px", 
          fontWeight: "bold",
          color: "#214B8C",
          margin: 0,
          lineHeight: 1
        }}>
          {remainingCredits !== null ? remainingCredits : "Loading..."}
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        {creditPacks.map((pack) => {
          const bannerStyle = getBannerStyle(pack.type);
          const cardStyle = getCardStyle(pack.type);
          
          return (
            <div
              key={pack.credits}
              style={{
                padding: "24px",
                backgroundColor: cardStyle.backgroundColor,
                borderRadius: "12px",
                border: `2px solid ${cardStyle.borderColor}`,
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "280px",
                transition: "transform 0.2s, box-shadow 0.2s",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 10px 15px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.05)";
              }}
            >
              {bannerStyle && (
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            backgroundColor: bannerStyle.backgroundColor,
            color: bannerStyle.color,
            padding: '4px 16px',
            borderRadius: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 1,
          }}
        >
          {bannerStyle.content}
        </div>
      )}

      <div>
        <h3
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#111827',
          }}
        >
          {pack.credits} Credits
        </h3>
        <p
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: pack.type === 'popular' ? '#7AB95C' : '#67CAD8',
            marginBottom: '16px',
          }}
        >
          ${pack.price.toFixed(2)}
        </p>
        <p
          style={{
            color: '#6b7280',
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          ${(pack.price / pack.credits).toFixed(2)} per credit
        </p>
      </div>

      <button
        onClick={() => handleBuyPack(pack)}
        style={{
          padding: '12px 24px',
          backgroundColor: pack.type === 'popular' ? '#7AB95C' : '#67CAD8',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500',
          width: '100%',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            pack.type === 'popular' ? '#699F4F' : '#5BB1BE';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            pack.type === 'popular' ? '#7AB95C' : '#67CAD8';
        }}
      >
        Purchase Now
      </button>
    </div>
  );
})}
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && selectedPack && paymentMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Confirm Purchase</h3>
            <p className="text-gray-600 mb-6">
              You are about to purchase <span className="font-medium text-gray-800">{selectedPack.credits} credits</span> for{" "}
              <span className="font-medium text-gray-800">${selectedPack.price.toFixed(2)}</span>
              <br />
              using <span className="font-medium text-gray-800">{paymentMethod.brand} •••• {paymentMethod.last4}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmPurchase}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium transition-colors inline-flex items-center justify-center gap-2 
                  ${isProcessing 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
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
  remainingCredits={remainingCredits}
/>

</div>
);
}

export default PurchaseCredits;
