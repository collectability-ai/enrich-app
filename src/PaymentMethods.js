import React, { useState, useEffect } from "react";

const PaymentMethods = ({ token }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/get-payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Send the token for authentication
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payment methods.");
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      setError("Unable to load payment methods.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  return (
    <div>
      <h2>Your Payment Methods</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {paymentMethods.length === 0 && !loading && <p>No payment methods available.</p>}
      <ul>
        {paymentMethods.map((method) => (
          <li key={method.id}>
            {method.brand} ending in {method.last4} (Expires {method.exp_month}/{method.exp_year})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentMethods;
