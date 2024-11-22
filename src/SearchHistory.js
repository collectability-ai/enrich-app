import React, { useEffect, useState } from "react";
import axios from "axios";

const SearchHistory = ({ userEmail }) => {
  const [history, setHistory] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    // Fetch search history
    const fetchHistory = async () => {
      try {
        const response = await axios.post("http://localhost:5000/get-search-history", {
          email: userEmail,
        });
        setHistory(response.data.history || []);
      } catch (error) {
        console.error("Error fetching search history:", error);
      }
    };

    fetchHistory();
  }, [userEmail]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Search History</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Timestamp</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Search Query</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, index) => (
            <tr key={index}>
              <td
                style={{ border: "1px solid #ccc", padding: "8px", color: "blue", cursor: "pointer" }}
                onClick={() => setSelectedResponse(entry.apiResponse)}
              >
                {new Date(entry.timestamp).toLocaleString()}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                {JSON.stringify(entry.searchQuery)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedResponse && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            zIndex: 1000,
          }}
        >
          <h3>API Response</h3>
          <pre style={{ background: "#f4f4f4", padding: "10px", borderRadius: "5px" }}>
            {JSON.stringify(selectedResponse, null, 2)}
          </pre>
          <button onClick={() => setSelectedResponse(null)} style={{ marginTop: "10px" }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchHistory;
