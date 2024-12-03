import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const InputForm = ({ userEmail }) => {
  const [searchQuery, setSearchQuery] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
    operation: "validate_and_enrich",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery({ ...searchQuery, [name]: value });
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/use-search", {
        email: userEmail,
        searchQuery,
      });

      // Navigate to ResultsPage with response data
      navigate("/results", { state: { data: response.data.data } });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Search failed");
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Search</h2>
      <form onSubmit={handleSearchSubmit}>
        {/* Input fields */}
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={searchQuery.firstName}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={searchQuery.lastName}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="text"
            name="addressLine1"
            placeholder="Address Line 1"
            value={searchQuery.addressLine1}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            value={searchQuery.city}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            value={searchQuery.state}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="text"
            name="zip"
            placeholder="ZIP Code"
            value={searchQuery.zip}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={searchQuery.email}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone"
            value={searchQuery.phone}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <select
            name="operation"
            value={searchQuery.operation}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          >
            <option value="validate">Validate</option>
            <option value="enrich">Enrich</option>
            <option value="validate_and_enrich">Validate and Enrich</option>
          </select>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </form>

      {/* Error message */}
      {error && (
        <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default InputForm;
