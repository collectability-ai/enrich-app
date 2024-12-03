import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchHistory from "./SearchHistory";

const Dashboard = ({ userEmail }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post("http://localhost:5000/check-credits", {
          email: userEmail,
        });
        setRemainingCredits(response.data.credits);
      } catch (err) {
        console.error("Error fetching credits:", err.message);
        setError(err.response?.data?.error?.message || "Failed to fetch remaining credits.");
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [userEmail]);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center" }}>Dashboard</h2>

      {loading ? (
        <p>Loading data...</p>
      ) : error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : (
        <div>
          <h3>Remaining Credits: {remainingCredits !== null ? remainingCredits : "N/A"}</h3>
        </div>
      )}

      <div style={{ marginTop: "30px" }}>
        {/* Fetch and display user's search history */}
        <SearchHistory userEmail={userEmail} />
      </div>
    </div>
  );
};

export default Dashboard;
