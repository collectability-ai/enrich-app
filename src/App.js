import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Dashboard from "./Dashboard";
import InputForm from "./InputForm";
import ResultsPage from "./ResultsPage";
import PurchaseCredits from "./PurchaseCredits";

const App = () => {
  const auth = useAuth();

  console.log("Auth User:", auth.user);
  console.log("Auth User Profile:", auth.user?.profile);
  console.log("Auth Token:", auth.user?.id_token);
  console.log("Authentication Status:", auth.isAuthenticated); // Debug auth status

  const handleSignOut = () => auth.removeUser();
  const handleSignIn = () => auth.signinRedirect();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Error: {auth.error.message}</div>;
  }

  return (
    <Router>
  <div style={{ display: "flex", minHeight: "100vh" }}>
    {/* Sidebar Navigation */}
    {auth.isAuthenticated && (
      <nav
        style={{
          width: "250px",
          backgroundColor: "#f8f9fa",
          padding: "20px",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "20px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: "150px",
              height: "auto",
            }}
          />
        </div>

        {/* User Email */}
        <div
          style={{
            fontSize: "14px",
            color: "#333",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          {auth.user?.profile?.email}
        </div>

        <Link
          to="/dashboard"
          style={{
            padding: "10px",
            textDecoration: "none",
            backgroundColor: "#007bff",
            color: "white",
            textAlign: "center",
            borderRadius: "4px",
            width: "100%",
          }}
        >
          Dashboard
        </Link>
        <Link
          to="/search"
          style={{
            padding: "10px",
            textDecoration: "none",
            backgroundColor: "#28a745",
            color: "white",
            textAlign: "center",
            borderRadius: "4px",
            width: "100%",
          }}
        >
          Search
        </Link>
        <Link
          to="/purchase-credits"
          style={{
            padding: "10px",
            textDecoration: "none",
            backgroundColor: "#ffc107",
            color: "white",
            textAlign: "center",
            borderRadius: "4px",
            width: "100%",
          }}
        >
          Purchase Credits
        </Link>

        <button
          onClick={handleSignOut}
          style={{
            padding: "10px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Sign Out
        </button>
      </nav>
    )}

    {/* Main Content */}
    <div style={{ flex: 1, padding: "20px" }}>
      {!auth.isAuthenticated ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h2>Welcome to the App</h2>
          <button
            onClick={handleSignIn}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            Sign In
          </button>
        </div>
      ) : (
        <Routes>
          <Route
            path="/dashboard"
            element={
              <Dashboard
                userEmail={auth.user?.profile?.email}
                token={auth.user?.id_token}
              />
            }
          />
          <Route
            path="/search"
            element={<InputForm userEmail={auth.user?.profile?.email} />}
          />
          <Route path="/results" element={<ResultsPage />} />
          <Route
            path="/purchase-credits"
            element={
              <PurchaseCredits
                userEmail={auth.user?.profile?.email}
                token={auth.user?.id_token}
              />
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      )}
    </div>
  </div>
</Router>

  );
};

export default App;
