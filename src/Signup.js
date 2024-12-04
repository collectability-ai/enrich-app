import React, { useState } from "react";
import axios from "axios";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    companyWebsite: "",
    companyEIN: "",
    useCase: "",
    termsAccepted: false,
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure Terms and Conditions are accepted
    if (!formData.termsAccepted) {
      setError("You must accept the Terms and Conditions to proceed.");
      return;
    }

    try {
      // Make API request to create Cognito user
      const response = await axios.post("http://localhost:5000/signup", formData);

      if (response.data.success) {
        setSuccess(true);
        setError(null);
        alert("Signup successful! Please log in.");
      } else {
        setError(response.data.message || "Signup failed.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Sign Up</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Signup successful! Redirecting...</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Phone Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Company Name</label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Company Website</label>
          <input
            type="text"
            name="companyWebsite"
            value={formData.companyWebsite}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Company EIN (Optional)</label>
          <input
            type="text"
            name="companyEIN"
            value={formData.companyEIN}
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Use Case</label>
          <select
            name="useCase"
            value={formData.useCase}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="">Select Use Case</option>
            <option value="Debt Collections">Debt Collections</option>
            <option value="Marketing">Marketing</option>
            <option value="Real Estate">Real Estate</option>
          </select>
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleChange}
              style={{ marginRight: "10px" }}
            />
            I accept the Terms and Conditions
          </label>
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
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default Signup;
