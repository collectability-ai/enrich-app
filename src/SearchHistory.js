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
    setRawResponse(rawResponseData);
  };

  const handleClosePopup = () => {
    setRawResponse(null);
  };

  const exportToCSV = () => {
    if (searchHistory.length === 0) {
      alert("No data to export.");
      return;
    }

    const csvContent = [
      [
        "Timestamp",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Address",
        "City",
        "State",
        "Zip",
        "Status",
        "Request ID",
        "Raw Response",
      ],
      ...searchHistory.map((entry) => [
        entry.timestamp,
        entry.searchQuery?.firstName || "N/A",
        entry.searchQuery?.lastName || "N/A",
        entry.searchQuery?.email || "N/A",
        entry.searchQuery?.phone || "N/A",
        entry.searchQuery?.addressLine1 || "N/A",
        entry.searchQuery?.city || "N/A",
        entry.searchQuery?.state || "N/A",
        entry.searchQuery?.zip || "N/A",
        entry.status,
        entry.requestID,
        JSON.stringify(entry.rawResponse),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "search_history.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Search History</h2>
      <div style={{ textAlign: "right", marginBottom: "10px" }}>
        <button
          onClick={exportToCSV}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export to CSV
        </button>
      </div>
      {loading ? (
        <p>Loading search history...</p>
      ) : error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : searchHistory.length === 0 ? (
        <p>No search history available.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Timestamp</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>First Name</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Last Name</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Email</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Phone</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Address</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>City</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>State</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Zip</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {searchHistory.map((entry) => (
              <tr
                key={entry.requestID}
                style={{
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => handleRowClick(entry.rawResponse)}
              >
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{entry.timestamp}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.firstName || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.lastName || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.email || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.phone || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.addressLine1 || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.city || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.state || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {entry.searchQuery?.zip || "N/A"}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{entry.status}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{entry.requestID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ textAlign: "right", marginTop: "10px" }}>
        <button
          onClick={exportToCSV}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export to CSV
        </button>
      </div>
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
          onClick={handleClosePopup}
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
            onClick={(e) => e.stopPropagation()}
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
              onClick={handleClosePopup}
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
