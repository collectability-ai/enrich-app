import React, { useState } from "react";
import axios from "axios";
import logger from "./logger"; // Import the logger

const CheckoutForm = ({ userEmail }) => {
  const [priceId, setPriceId] = useState("price_1QNgCzAUGHTClvwyl3xyl6K2"); // Default 25-pack
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePurchase = async () => {
    try {
      const response = await axios.post("http://localhost:5000/purchase-pack", {
        email: userEmail,
        priceId,
      });

      setPaymentSuccess(true);
      setErrorMessage("");
      console.log("Purchase response:", response.data);
      alert(`Pack purchased successfully! Remaining credits: ${response.data.remainingCredits}`);

      // Log success message to console and file
      logger.info(`Pack purchased successfully for ${userEmail}. Remaining credits: ${response.data.remainingCredits}`);
    } catch (err) {
      // Enhanced error handling
      const errorMessage = err.response?.data?.error?.message || "An error occurred.";
      setPaymentSuccess(false);
      setErrorMessage(errorMessage);

      console.error("Error purchasing pack:", errorMessage);
      logger.error(`Purchase Pack Error for ${userEmail}: ${errorMessage}`); // Log error to file

      // Display an alert with the error message
      alert(`Error purchasing pack: ${errorMessage}`);
    }
  };

  return (
    <div>
      <h2>Purchase Pack</h2>
      <label htmlFor="package">Choose a package:</label>
      <select id="package" value={priceId} onChange={(e) => setPriceId(e.target.value)}>
        <option value="price_1QNgCzAUGHTClvwyfnBxMXtF">5-pack ($5)</option>
        <option value="price_1QNgCzAUGHTClvwyl3xyl6K2">25-pack ($25)</option>
        <option value="price_1QNgCzAUGHTClvwySgfbcXGk">100-pack ($100)</option>
        <option value="price_1QNgCzAUGHTClvwy34bnpfSC">500-pack ($225)</option>
      </select>
      <br />
      <button onClick={handlePurchase}>Purchase</button>
      {paymentSuccess && <p>Purchase successful! Credits have been added to your account.</p>}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </div>
  );
};

export default CheckoutForm;
