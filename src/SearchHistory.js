import React, { useState, useEffect } from "react";
import axios from "axios";

const SearchHistory = ({ userEmail, token }) => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

 useEffect(() => {
  let isMounted = true; // For cleanup

  const fetchSearchHistory = async () => {
    setLoading(true);
    setError(null);
    setSearchHistory([]); // Clear immediately when effect runs
    setFilteredHistory([]); // Clear immediately when effect runs

    if (!userEmail) {
      console.log("Waiting for user email...");
      return;
    }

    try {
      console.log("Calling URL:", `${process.env.REACT_APP_API_BASE_URL}/get-search-history`);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/get-search-history`,
        { email: userEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (isMounted) { // Only set state if component is still mounted
        const sortedHistory = response.data.history.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setSearchHistory(sortedHistory);
        setFilteredHistory(sortedHistory);
      }
    } catch (err) {
      if (isMounted) {
        console.error("Error fetching search history:", err.message);
        setError(err.response?.data?.error?.message || "Failed to fetch search history.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchSearchHistory();

  // Cleanup function
  return () => {
    isMounted = false;
    setSearchHistory([]);
    setFilteredHistory([]);
  };
}, [userEmail, token]);

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

  setIsExporting(true);
  try {
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
  } finally {
    setIsExporting(false);
  }
};

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-6 text-center">Search History</h2>

      {/* Search and Export Controls */}
      <div className="flex justify-between items-center mb-6">
  <div className="flex items-center gap-2 flex-1">
    <input
      type="text"
      placeholder="Search by EnVrequestID or Full Name"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67cad8] focus:border-transparent"
    />
    <button
      onClick={handleSearch}
      className="px-4 py-2 bg-[#67cad8] hover:bg-[#5ab5c2] text-white rounded-md transition-colors"
    >
      Search
    </button>
    <button
      onClick={exportToCSV}
      disabled={isExporting}
      className="px-4 py-2 bg-[#2c5282] hover:bg-[#2a4365] text-white rounded-md transition-colors flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        "Export to CSV"
      )}
    </button>
  </div>
</div>

      {/* Items per page selector */}
      <div className="mb-4 flex items-center">
        <label htmlFor="itemsPerPage" className="mr-2">Items per page:</label>
        <select
          id="itemsPerPage"
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67cad8] focus:border-transparent"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center">Loading search history...</p>
      ) : error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : filteredHistory.length === 0 ? (
        <p className="text-gray-500 text-center">No search history available.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">First Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Last Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">City</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">State</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Zip</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border border-gray-200">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((entry) => (
                  <tr
                    key={entry.requestID}
                    onClick={() => handleRowClick(entry.rawResponse)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 border border-gray-200">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.firstName || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.lastName || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.email || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.phone || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.addressLine1 || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.city || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.state || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.searchQuery?.zip || "N/A"}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.status}</td>
                    <td className="px-4 py-3 border border-gray-200">{entry.requestID}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className={`px-4 py-2 rounded-md text-white transition-colors
                ${currentPage === 1 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className={`px-4 py-2 rounded-md text-white transition-colors
                ${currentPage === totalPages 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#67cad8] hover:bg-[#5ab5c2]"}`}
            >
              Next
            </button>
          </div>
        </>
      )}

    {/* Raw Response Modal */}
     {rawResponse && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClosePopup}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] w-full mx-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-center">Raw Response</h3>
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md text-sm">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
            <button
              onClick={handleClosePopup}
              className="mt-4 px-4 py-2 bg-[#67cad8] hover:bg-[#5ab5c2] text-white rounded-md transition-colors mx-auto block"
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

