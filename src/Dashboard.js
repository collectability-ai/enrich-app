import React, { useEffect, useState } from "react";
import axios from "axios";

const Dashboard = ({ userEmail }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);

  useEffect(() => {
    // Fetch remaining credits
    const fetchCredits = async () => {
      try {
        const response = await axios.post("http://localhost:5000/check-credits", {
          email: userEmail,
        });
        setRemainingCredits(response.data.credits);
      } catch (error) {
        console.error("Error fetching credits:", error);
        setRemainingCredits("Error loading credits");
      }
    };

    fetchCredits();
  }, [userEmail]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Dashboard</h2>
      <p>Welcome, {userEmail}</p>
      <h3>
        Remaining Credits:{" "}
        {remainingCredits !== null ? remainingCredits : "Loading..."}
      </h3>
    </div>
  );
};

export default Dashboard;
