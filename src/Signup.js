import React, { useState } from "react";
import { signUp } from 'aws-amplify/auth';
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    companyWebsite: "",
    companyEIN: "",
    useCase: "",
    termsAccepted: false,
    password: "",
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      setError("You must accept the Terms and Conditions to proceed.");
      return;
    }

    const passwordRequirements = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRequirements.test(formData.password)) {
      setError(
        "Password must be at least 8 characters long, include one uppercase letter and one number."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Format phone number to include country code if not present
      const formattedPhone = formData.phone.startsWith('+') 
        ? formData.phone 
        : `+1${formData.phone.replace(/\D/g, '')}`;

      const signUpResult = await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            phone_number: formattedPhone,
            name: formData.name,
            'custom:companyName': formData.companyName,
            'custom:companyWebsite': formData.companyWebsite,
            'custom:companyEIN': formData.companyEIN || '',
            'custom:useCase': formData.useCase
          },
          autoSignIn: true
        }
      });

      console.log('Sign up success:', signUpResult);
      
      setSuccess(true);
      alert("Signup successful! Please check your email for verification code.");
      
      // Store email temporarily for verification
      sessionStorage.setItem('pendingVerificationEmail', formData.email);
      
      // Navigate to verification page (you'll need to create this)
      setTimeout(() => {
        navigate("/verify");
      }, 2000);

    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "600px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Sign Up</h2>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {success && (
          <p style={{ color: "green", textAlign: "center" }}>
            Signup successful! Redirecting to verification...
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
              placeholder="+1234567890"
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Company EIN (Optional)</label>
            <input
              type="text"
              name="companyEIN"
              value={formData.companyEIN}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Use Case</label>
            <select
              name="useCase"
              value={formData.useCase}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
              backgroundColor: isLoading ? "#ccc" : "#67cad8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            disabled={isLoading}
          >
            {isLoading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <p>Already a user?</p>
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#67cad8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default Signup;