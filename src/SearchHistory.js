import React, { useState, useEffect } from "react";
import axios from "axios";

const SearchHistory = ({ userEmail }) => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);

  useEffect(() => {
    const fetchSearchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post("http://localhost:5000/get-search-history", {
          email: userEmail,
        });
        setSearchHistory(response.data.history || []);
      } catch (err) {
        console.error("Error fetching search history:", err.message);
        setError(err.response?.data?.error?.message || "Failed to fetch search history.");
      } finally {
        setLoading(false);
      }
    };

    fetchSearchHistory();
  }, [userEmail]);

const handleRowClick = (rawResponseData) => {
  try {
    const parsedResponse = JSON.parse(rawResponseData);
    setRawResponse(parsedResponse);
  } catch (err) {
    console.error("Failed to parse raw response:", err);
    setRawResponse(rawResponseData); // Fallback to original data if parsing fails
  }
};

  const handleClosePopup = (event) => {
  if (event && event.target && event.target.id === "popup-overlay") {
    setRawResponse(null);
  } else if (!event) {
    // In cases where event is undefined (e.g., button click)
    setRawResponse(null);
  }
};

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Search History</h2>
      {loading ? (
        <p>Loading search history...</p>
      ) : error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : searchHistory.length === 0 ? (
        <p>No search history available.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid black", padding: "10px" }}>Timestamp</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>First Name</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Last Name</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Email</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Phone</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Address</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>City</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>State</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Zip</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Status</th>
              <th style={{ border: "1px solid black", padding: "10px" }}>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {searchHistory.map((entry) => (
              <tr
                key={entry.requestID}
                style={{ cursor: "pointer" }}
                onClick={() => handleRowClick(entry.rawResponse)}
              >
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.timestamp}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.firstName || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.lastName || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.email || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.phone || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.addressLine1 || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.city || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.state || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.searchQuery?.zip || "N/A"}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.status}</td>
                <td style={{ border: "1px solid black", padding: "10px" }}>{entry.requestID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

  {rawResponse && (
  <div
    id="popup-overlay"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
    onClick={handleClosePopup} // Overlay click
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "80%",
        maxHeight: "80%",
        overflowY: "auto",
        textAlign: "left",
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the popup
    >
      <h3 style={{ textAlign: "center" }}>Raw Response</h3>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          backgroundColor: "#f9f9f9",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {JSON.stringify(rawResponse, null, 2)}
      </pre>
      <button
        onClick={() => handleClosePopup()} // Button click calls handleClosePopup without event
        style={{
          marginTop: "10px",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          padding: "10px 20px",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default SearchHistory;
