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
  });

  const [responseData, setResponseData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage("Processing your request...");
    setResponseData(null);

    try {
      // Log the payload being sent to the API
      console.log("Payload sent to Enrich and Validate API:", {
        FirstName: formData.firstName,
        LastName: formData.lastName,
        Email: formData.email,
        Phone: formData.phone,
        Address: {
          addressLine1: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        },
      });

      // Step 1: Call the Enrich and Validate API
      const enrichResponse = await axios.post(
        "https://8zb4x5d8q4.execute-api.us-east-2.amazonaws.com/SandBox/enrichandvalidate",
        {
          FirstName: formData.firstName,
          LastName: formData.lastName,
          Email: formData.email,
          Phone: formData.phone,
          Address: {
            addressLine1: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const enrichData = enrichResponse.data;
      console.log("API Response from Enrich and Validate:", enrichData);

      // If no data is returned, display a message and stop further actions
      if (!enrichData || Object.keys(enrichData).length === 0) {
        setMessage("No data found. No credit deducted.");
        return;
      }

      // Step 2: Call /use-search to deduct a credit
      console.log("Payload sent to /use-search:", { email: userEmail });
      const deductResponse = await axios.post("http://localhost:5000/use-search", {
        email: userEmail,
      });

      console.log("Credit Deduction Response:", deductResponse.data);

      // Step 3: Display results and success message
      setResponseData(enrichData);
      setMessage(deductResponse.data.message || "Search recorded successfully.");
    } catch (err) {
      const errorMessage =
        err.response?.data?.error?.message || "An error occurred. Please try again.";
      setError(errorMessage);
      setMessage(errorMessage);
      console.error("Error during search:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Search Form</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
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
    </div>
  );
};

export default InputForm;
