import React, { useState, useEffect } from "react";
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem('pendingVerificationEmail');
    if (!storedEmail) {
      navigate('/signup');
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: verificationCode
      });

      setSuccess(true);
      sessionStorage.removeItem('pendingVerificationEmail');
      
      // Show success message and redirect to login
      alert("Email verified successfully! Please log in.");
      navigate('/login');
    } catch (error) {
      console.error("Verification error:", error);
      setError(error.message || "Failed to verify email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendDisabled(true);
      setCountdown(30); // Disable resend for 30 seconds
      
      await resendSignUpCode({
        username: email
      });
      
      alert("Verification code has been resent to your email.");
    } catch (error) {
      console.error("Error resending code:", error);
      setError(error.message || "Failed to resend verification code.");
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#f5f5f5"
    }}>
      <div style={{
        width: "400px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "20px"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Verify Your Email</h2>
        
        {error && (
          <p style={{ color: "red", textAlign: "center" }}>{error}</p>
        )}
        
        {success && (
          <p style={{ color: "green", textAlign: "center" }}>
            Email verified successfully! Redirecting to login...
          </p>
        )}

        <p style={{ textAlign: "center", marginBottom: "20px" }}>
          Please enter the verification code sent to {email}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter verification code"
              required
              style={{
                width: "100%",
                padding: "10px",
                margin: "5px 0",
                borderRadius: "4px",
                border: "1px solid #ccc"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: isLoading ? "#ccc" : "#67cad8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              marginBottom: "10px"
            }}
          >
            {isLoading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          onClick={handleResendCode}
          disabled={resendDisabled}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: resendDisabled ? "#ccc" : "#67cad8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: resendDisabled ? "not-allowed" : "pointer"
          }}
        >
          {countdown > 0 
            ? `Resend Code (${countdown}s)` 
            : "Resend Code"}
        </button>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              color: "#67cad8",
              border: "1px solid #67cad8",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;