import React, { useState, useEffect } from "react";
import axios from "axios";

const CreditsRemaining = ({ userEmail }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await axios.post("http://localhost:5000/check-credits", {
          email: userEmail,
        });
        setRemainingCredits(response.data.credits || 0);
      } catch (err) {
        setError("Failed to fetch remaining credits.");
        console.error(err);
      }
    };

    fetchCredits();
  }, [userEmail]);

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Credits Remaining</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {remainingCredits !== null ? (
        <p style={{ fontSize: "18px", fontWeight: "bold" }}>{remainingCredits}</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default CreditsRemaining;
