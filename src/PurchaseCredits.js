import React, { useState, useEffect } from "react";

const PurchaseCredits = ({ userEmail, token }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  
  const creditPacks = [
    { credits: 3, price: 2.0, priceId: "price_1QOubIAUGHTClvwyCb4r0ffE", type: "basic" },
    { credits: 10, price: 5.97, priceId: "price_1QOv9IAUGHTClvwyRj2ChIb3", type: "basic" },
    { credits: 50, price: 19.97, priceId: "price_1QOv9IAUGHTClvwyzELdaAiQ", type: "basic" },
    { credits: 150, price: 49.97, priceId: "price_1QOv9IAUGHTClvwyxw7vJURF", type: "popular" },
    { credits: 500, price: 119.97, priceId: "price_1QOv9IAUGHTClvwyMRquKtpG", type: "premium" },
    { credits: 1000, price: 199.97, priceId: "price_1QOv9IAUGHTClvwyBH9Jh7ir", type: "premium" },
    { credits: 1750, price: 279.97, priceId: "price_1QOv9IAUGHTClvwykbXsElbr", type: "premium" }
  ];

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/check-credits`, {
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

  // Preserve existing handleBuyPack function exactly as is
  const handleBuyPack = async (pack) => {
    try {
      console.log("Token sent:", token);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/get-payment-methods`, {
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
        const paymentMethod = data.paymentMethods[0];
        const confirmPurchase = window.confirm(
          `You are about to purchase ${pack.credits} credits for $${pack.price} using your ${paymentMethod.brand} card ending in ${paymentMethod.last4}. Do you want to proceed?`
        );

        if (confirmPurchase) {
          const purchaseResponse = await fetch(`${process.env.REACT_APP_API_URL}/purchase-pack`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userEmail,
              priceId: pack.priceId,
              paymentMethodId: paymentMethod.id,
            }),
          });

          if (!purchaseResponse.ok) {
            throw new Error("Failed to process the purchase.");
          }

          const purchaseData = await purchaseResponse.json();
          alert(`Purchase successful! Remaining Credits: ${purchaseData.remainingCredits}`);
          
          // Update displayed credits after successful purchase
          setRemainingCredits(purchaseData.remainingCredits);
        }
      } else {
        console.log("No payment methods found, creating Stripe Checkout session...");
        const checkoutResponse = await fetch(`${process.env.REACT_APP_API_URL}/create-checkout-session`, {
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
        console.log("Redirecting to Stripe Checkout:", checkoutData.url);
        window.location.href = checkoutData.url;
      }
    } catch (error) {
      console.error("Error processing purchase:", error);
      alert("An error occurred. Please try again.");
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
    </div>
  );
};

export default PurchaseCredits;