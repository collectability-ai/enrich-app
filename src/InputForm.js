import React, { useState } from "react";
import axios from "axios";

const InputForm = ({ userEmail }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    operation: "validate_and_enrich", // Default search type
  });

  const [responseData, setResponseData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false); // Modal for confirmation
  const [showResultModal, setShowResultModal] = useState(false); // Modal for success/error result
  const [remainingCredits, setRemainingCredits] = useState(0);

  const operationLabels = {
    enrich: "Contact Enrich Search",
    validate: "Contact Validation Search",
    validate_and_enrich: "Contact Enrich and Validate Search",
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const { firstName, lastName, address, city, state, zip, email, phone } = formData;

    if (!firstName.trim() || !lastName.trim()) {
      return "First Name and Last Name are required.";
    }

    const hasAddress = address.trim() || city.trim() || state.trim() || zip.trim();
    const hasContactInfo = phone.trim() || email.trim() || hasAddress;

    if (!hasContactInfo) {
      return "At least one of Address, Phone, or Email must be provided.";
    }

    return ""; // No validation errors
  };

  const handleConfirm = async () => {
    setShowModal(false); // Close confirmation modal
    setLoading(true);
    setError(null);
    setMessage("Processing your request...");
    setResponseData(null);

    try {
      // Prepare payload for the API
      const payload = {
        email: userEmail,
        searchQuery: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          addressLine1: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          operation: formData.operation,
        },
      };

      console.log("Payload sent to /use-search:", payload);

      // Call /use-search API
      const response = await axios.post("http://localhost:5000/use-search", payload);

      console.log("API Response:", response.data);

      setResponseData(response.data.data || {});
      setMessage(response.data.message || "Search completed successfully!");
      setRemainingCredits(response.data.remainingCredits || 0); // Update remaining credits

      setShowResultModal(true); // Show success modal
    } catch (err) {
      const errorMessage =
        err.response?.data?.error?.message || "An error occurred. Please try again.";
      const remainingCredits = err.response?.data?.remainingCredits || 0; // Get remaining credits
      setError(errorMessage);
      setMessage(errorMessage);
      setRemainingCredits(remainingCredits); // Update credits on error
      console.error("Error during search:", err);

      setShowResultModal(true); // Show error modal
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form input
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setMessage(validationError);
      return;
    }

    setShowModal(true); // Show confirmation modal
  };

  return (
    <div className="form-container" style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Search Form</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
        {/* Search Type Field at the Top */}
        <div>
          <label>Search Type:</label>
          <div>
            <label>
              <input
                type="radio"
                name="operation"
                value="enrich"
                checked={formData.operation === "enrich"}
                onChange={handleChange}
              />
              Contact Enrich Search
            </label>
          </div>
          <div>
            <label>
              <input
                type="radio"
                name="operation"
                value="validate"
                checked={formData.operation === "validate"}
                onChange={handleChange}
              />
              Contact Validation Search
            </label>
          </div>
          <div>
            <label>
              <input
                type="radio"
                name="operation"
                value="validate_and_enrich"
                checked={formData.operation === "validate_and_enrich"}
                onChange={handleChange}
              />
              Contact Enrich and Validate Search
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="firstName">First Name*</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="lastName">Last Name*</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="address">Street Address</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="city">City</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="state">State</label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label htmlFor="zip">Zip Code</label>
          <input
            type="text"
            id="zip"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "10px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
      {message && <p style={{ color: message.includes("error") ? "red" : "green" }}>{message}</p>}
      {responseData && (
        <div style={{ marginTop: "20px" }}>
          <h3>Search Results:</h3>
          <pre style={{ backgroundColor: "#f9f9f9", padding: "10px", borderRadius: "4px" }}>
            {JSON.stringify(responseData, null, 2)}
          </pre>
        </div>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {/* Confirmation Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p>
              You are about to use{" "}
              <strong>{formData.operation === "validate_and_enrich" ? 3 : 2}</strong> credits to
              perform <strong>{operationLabels[formData.operation]}</strong>. Confirm to continue.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
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
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            {error ? (
              <>
                <p>
                  <strong>Error:</strong> {message}
                </p>
                <p>You have not been charged any credits. Remaining credits: {remainingCredits}</p>
              </>
            ) : (
              <>
                <p>
                  <strong>Success!</strong> You have {remainingCredits} credits remaining.
                </p>
                <button
                  onClick={() => setShowResultModal(false)}
                  style={{
                    padding: "10px",
                    backgroundColor: "#007BFF",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  View Results
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputForm;
