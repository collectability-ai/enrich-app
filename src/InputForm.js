import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const InputForm = ({ userEmail, userCredits }) => {
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
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  // Map operation names to friendly names and credits
  const operationDetails = {
    validate: { name: "Validate", credits: 2 },
    enrich: { name: "Enrich", credits: 2 },
    validate_and_enrich: { name: "Validate and Enrich", credits: 3 },
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery({ ...searchQuery, [name]: value });
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    setShowDialog(false);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/use-search", {
        email: userEmail,
        searchQuery,
      });

      navigate("/results", { state: { data: response.data.data } });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Search failed");
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
  };

  const selectedOperation = operationDetails[searchQuery.operation];

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
      <form onSubmit={handleSubmitClick}>
        <div style={{ marginBottom: "10px" }}>
          {/* Input fields */}
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

      {/* Confirmation dialog */}
      {showDialog && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              textAlign: "center",
              width: "90%",
              maxWidth: "400px",
            }}
          >
            <p>
              You are about to use <strong>{selectedOperation.credits}</strong>{" "}
              credit(s) to perform a{" "}
              <strong>{selectedOperation.name}</strong> search.
            </p>
            <div style={{ marginTop: "20px" }}>
              <button
                onClick={handleConfirm}
                style={{
                  marginRight: "10px",
                  padding: "10px",
                  backgroundColor: "#007BFF",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: "10px",
                  backgroundColor: "#FF0000",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default InputForm;
