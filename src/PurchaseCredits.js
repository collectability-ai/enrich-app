import React from "react";

const PurchaseCredits = ({ userEmail, token }) => {
  const creditPacks = [
    { credits: 3, price: 2.0, priceId: "price_1QOubIAUGHTClvwyCb4r0ffE" },
    { credits: 10, price: 5.97, priceId: "price_1QOv9IAUGHTClvwyRj2ChIb3" },
    { credits: 50, price: 19.97, priceId: "price_1QOv9IAUGHTClvwyzELdaAiQ" },
    { credits: 150, price: 49.97, priceId: "price_1QOv9IAUGHTClvwyxw7vJURF" },
    { credits: 500, price: 119.97, priceId: "price_1QOv9IAUGHTClvwyMRquKtpG" },
    { credits: 1000, price: 199.97, priceId: "price_1QOv9IAUGHTClvwyBH9Jh7ir" },
    { credits: 1750, price: 279.97, priceId: "price_1QOv9IAUGHTClvwykbXsElbr" },
  ];

  const handleBuyPack = async (pack) => {
    try {
      // Check if the user has a saved payment method
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

      if (data.paymentMethods && data.paymentMethods.length > 0) {
        // If payment method exists, show a confirmation popup
        const paymentMethod = data.paymentMethods[0]; // Use the first payment method
        const confirmPurchase = window.confirm(
          `You are about to purchase ${pack.credits} credits for $${pack.price} using your ${paymentMethod.brand} card ending in ${paymentMethod.last4}. Do you want to proceed?`
        );

        if (confirmPurchase) {
          // Process the purchase
          const purchaseResponse = await fetch("http://localhost:5000/purchase-pack", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userEmail,
              priceId: pack.priceId, // Attach price ID of the selected pack
              paymentMethodId: paymentMethod.id,
            }),
          });

          if (!purchaseResponse.ok) {
            throw new Error("Failed to process the purchase.");
          }

          const purchaseData = await purchaseResponse.json();
          alert(`Purchase successful! Remaining Credits: ${purchaseData.remainingCredits}`);
        }
      } else {
        // If no payment method exists, redirect to Stripe checkout
        const checkoutResponse = await fetch("http://localhost:5000/create-checkout-session", {
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
        window.location.href = checkoutData.url; // Redirect to Stripe checkout
      }
    } catch (error) {
      console.error("Error processing purchase:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Purchase Credits</h2>
      <div>
        {/* Top Row - 4 Boxes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {creditPacks.slice(0, 4).map((pack) => (
            <div
              key={pack.credits}
              style={{
                padding: "30px",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
                height: "200px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <h3>{pack.credits} Credits</h3>
              <p style={{ fontSize: "18px", fontWeight: "bold" }}>${pack.price.toFixed(2)}</p>
              <button
                onClick={() => handleBuyPack(pack)}
                style={{
                  marginTop: "10px",
                  padding: "10px 20px",
                  backgroundColor: "#67cad8",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Row - 3 Larger Boxes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
          }}
        >
          {creditPacks.slice(4).map((pack) => (
            <div
              key={pack.credits}
              style={{
                padding: "45px", // Increased padding for larger boxes
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
                height: "250px", // Increased height for larger boxes
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <h3>{pack.credits} Credits</h3>
              <p style={{ fontSize: "20px", fontWeight: "bold" }}>${pack.price.toFixed(2)}</p>
              <button
                onClick={() => handleBuyPack(pack)}
                style={{
                  marginTop: "10px",
                  padding: "12px 24px",
                  backgroundColor: "#67cad8",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PurchaseCredits;
