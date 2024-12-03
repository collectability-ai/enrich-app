import React from "react";
import CheckoutForm from "./CheckoutForm";

const PurchaseCredits = ({ userEmail, token }) => {
  console.log("Received userEmail in PurchaseCredits:", userEmail);
  console.log("Received token in PurchaseCredits:", token);

  return <CheckoutForm userEmail={userEmail} token={token} />;
};

export default PurchaseCredits;