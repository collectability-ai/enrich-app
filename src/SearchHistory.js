import React, { useState, useEffect } from "react";
import axios from "axios";

const SearchHistory = ({ userEmail }) => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchSearchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post("http://localhost:5000/get-search-history", {
          email: userEmail,
        });

        // Sort history by most recent timestamp first
        const sortedHistory = response.data.history.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setSearchHistory(sortedHistory);
        setFilteredHistory(sortedHistory);
      } catch (err) {
        console.error("Error fetching search history:", err.message);
        setError(err.response?.data?.error?.message || "Failed to fetch search history.");
      } finally {
        setLoading(false);
      }
    };

    fetchSearchHistory();
  }, [userEmail]);

  const handleSearch = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredHistory(searchHistory);
      return;
    }

    const filtered = searchHistory.filter((entry) => {
      const fullName = `${entry.searchQuery?.firstName || ""} ${entry.searchQuery?.lastName || ""}`.toLowerCase();
      return (
        entry.EnVrequestID?.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });

    setFilteredHistory(filtered);
    setCurrentPage(1); // Reset to the first page when filtering
  };

  const handleRowClick = (rawResponseData) => {
    setRawResponse(rawResponseData);
  };

  const handleClosePopup = () => {
    setRawResponse(null);
  };

  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
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
      ...filteredHistory.map((entry) => [
        new Date(entry.timestamp).toISOString().replace("T", " ").split(".")[0],
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

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Search History</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Search by EnVrequestID or Full Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: "8px", width: "80%", marginRight: "10px" }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: "10px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

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
      ) : filteredHistory.length === 0 ? (
        <p>No search history available.</p>
      ) : (
        <>
          <div style={{ marginBottom: "10px" }}>
            <label htmlFor="itemsPerPage">Items per page:</label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page
              }}
              style={{ marginLeft: "10px", padding: "5px" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

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
              {paginatedData.map((entry) => (
                <tr
                  key={entry.requestID}
                  style={{
                    borderBottom: "1px solid #ddd",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRowClick(entry.rawResponse)}
                >
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              style={{
                padding: "10px",
                backgroundColor: "#007BFF",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              style={{
                padding: "10px",
                backgroundColor: "#007BFF",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </>
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
