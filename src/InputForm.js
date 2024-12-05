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
        backgroundColor: "#f5f5f5",
        padding: "20px",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          padding: "20px",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Search</h2>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        <form onSubmit={handleSubmitClick}>
          <div style={{ marginBottom: "15px" }}>
            {[
              { name: "firstName", placeholder: "First Name" },
              { name: "lastName", placeholder: "Last Name" },
              { name: "addressLine1", placeholder: "Address Line 1" },
              { name: "city", placeholder: "City" },
              { name: "state", placeholder: "State" },
              { name: "zip", placeholder: "ZIP Code" },
              { name: "email", placeholder: "Email", type: "email" },
              { name: "phone", placeholder: "Phone", type: "tel" },
            ].map(({ name, placeholder, type = "text" }) => (
              <input
                key={name}
                type={type}
                name={name}
                placeholder={placeholder}
                value={searchQuery[name]}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            ))}
            <select
              name="operation"
              value={searchQuery.operation}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
              backgroundColor: "#67cad8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Submit
          </button>
        </form>
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
              }}
            >
              <p>
                You are about to use <strong>{selectedOperation.credits}</strong>{" "}
                credit(s) for a <strong>{selectedOperation.name}</strong> search.
              </p>
              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={handleConfirm}
                  style={{
                    marginRight: "10px",
                    padding: "10px",
                    backgroundColor: "#67cad8",
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
      </div>
    </div>
  );
};

export default InputForm;
