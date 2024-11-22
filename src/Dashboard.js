import React, { useState, useEffect } from "react";
import axios from "axios";

const Dashboard = ({ userEmail }) => {
  const [credits, setCredits] = useState("Loading...");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch credits from the backend
    const fetchCredits = async () => {
      try {
        const response = await axios.post("http://localhost:5000/check-credits", { email: userEmail });
        setCredits(response.data.remainingCredits);
      } catch (err) {
        setError("Error fetching credits");
        console.error("Error fetching credits:", err);
      }
    };

    fetchCredits();
  }, [userEmail]);

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Dashboard</h2>
      <p>Email: {userEmail}</p>
      <p>Searches Remaining: {error || credits}</p>
    </div>
  );
};

export default Dashboard;

