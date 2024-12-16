import React, { useState, useEffect } from "react";
import { X, Check, Loader } from 'lucide-react';

console.log("API Base URL:", process.env.REACT_APP_API_BASE_URL);

const PurchaseCredits = ({ userEmail, token }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  
  const creditPacks = [
    { credits: 3, price: 2.0, priceId: "price_1QOubIAUGHTClvwyCb4r0ffE", type: "basic" },
    { credits: 10, price: 5.97, priceId: "price_1QOv9IAUGHTClvwyRj2ChIb3", type: "basic" },
    { credits: 50, price: 19.97, priceId: "price_1QOv9IAUGHTClvwyzELdaAiQ", type: "basic" },
    { credits: 150, price: 49.97, priceId: "price_1QOv9IAUGHTClvwyxw7vJURF", type: "popular" },
    { credits: 500, price: 119.97, priceId: "price_1QOv9IAUGHTClvwyMRquKtpG", type: "premium" },
    { credits: 1000, price: 199.97, priceId: "price_1QOv9IAUGHTClvwyBH9Jh7ir", type: "premium" },
    { credits: 1750, price: 279.97, priceId: "price_1QOv9IAUGHTClvwykbXsElbr", type: "premium" }
  ];

  const Modal = ({ children, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          position: 'relative',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
          {children}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchCredits = async () => {
      try {
 // Log the constructed URL
        console.log("Calling URL:", `${process.env.REACT_APP_API_BASE_URL}/check-credits`);

        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/check-credits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ email: userEmail })
        });
        if (response.ok) {
          const data = await response.json();
          setRemainingCredits(data.credits);
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      }
    };
    fetchCredits();
  }, [userEmail, token]);

  const handleBuyPack = async (pack) => {
    setSelectedPack(pack);
    try {
      console.log("Token sent:", token);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`, {
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

      if (data.paymentMethods && data.paymentMethods.length > 0) {
        setPaymentMethod(data.paymentMethods[0]);
        setShowConfirmModal(true);
      } else {
        console.log("No payment methods found, creating Stripe Checkout session...");
        const checkoutResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userEmail,
            priceId: pack.priceId,
          }),
        });

        if (!checkoutResponse.ok) {
          throw new Error("Failed to create a checkout session.");
        }

        const checkoutData = await checkoutResponse.json();
        window.location.href = checkoutData.url;
      }
    } catch (error) {
      console.error("Error processing purchase:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleConfirmPurchase = async () => {
    setIsProcessing(true);
    try {
      const purchaseResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/purchase-pack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          priceId: selectedPack.priceId,
          paymentMethodId: paymentMethod.id,
        }),
      });

      if (!purchaseResponse.ok) {
        throw new Error("Failed to process the purchase.");
      }

      const purchaseData = await purchaseResponse.json();
      setRemainingCredits(purchaseData.remainingCredits);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error processing purchase:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

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
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  backgroundColor: bannerStyle.backgroundColor,
                  color: bannerStyle.color,
                  padding: "4px 16px",
                  borderRadius: "0 0 8px 0",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  zIndex: 1
                }}>
                  {bannerStyle.content}
                </div>
              )}
              
              <div>
                <h3 style={{ 
                  fontSize: "24px", 
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#111827"
                }}>
                  {pack.credits} Credits
                </h3>
                <p style={{ 
                  fontSize: "32px", 
                  fontWeight: "bold",
                  color: pack.type === 'popular' ? '#7AB95C' : '#67CAD8',
                  marginBottom: "16px"
                }}>
                  ${pack.price.toFixed(2)}
                </p>
                <p style={{ 
                  color: "#6b7280",
                  fontSize: "14px",
                  marginBottom: "16px"
                }}>
                  ${(pack.price / pack.credits).toFixed(2)} per credit
                </p>
              </div>

              <button
                onClick={() => handleBuyPack(pack)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: pack.type === 'popular' ? '#7AB95C' : '#67CAD8',
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  width: "100%",
                  transition: "background-color 0.2s"
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
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Confirm Purchase</h3>
          {selectedPack && paymentMethod && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ marginBottom: '16px' }}>
                You are about to purchase {selectedPack.credits} credits for ${selectedPack.price.toFixed(2)} using your {paymentMethod.brand} card ending in {paymentMethod.last4}.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={isProcessing}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isProcessing ? 0.7 : 1
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                      Processing...
                    </>
                  ) : (
                    'Confirm Purchase'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ 
              backgroundColor: '#dcfce7', 
              borderRadius: '50%', 
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check size={32} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Purchase Successful!</h3>
          <p style={{ marginBottom: '16px' }}>Your credits have been added to your account.</p>
          <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            Remaining Credits: {remainingCredits}
          </p>
          <button
            onClick={() => setShowSuccessModal(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseCredits;