import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Dashboard from "./Dashboard";
import InputForm from "./InputForm";
import ResultsPage from "./ResultsPage";
import PurchaseCredits from "./PurchaseCredits";
import PaymentMethods from "./PaymentMethods"; // New Import

const App = () => {
  const auth = useAuth();

  console.log("Auth User:", auth.user);
  console.log("Auth User Profile:", auth.user?.profile);
  console.log("Auth Token:", auth.user?.id_token);

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
              width: "200px",
              backgroundColor: "#f8f9fa",
              padding: "20px",
              boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <h2 style={{ textAlign: "center", fontSize: "18px" }}>Navigation</h2>
            <Link
              to="/dashboard"
              style={{
                padding: "10px",
                textDecoration: "none",
                backgroundColor: "#007bff",
                color: "white",
                textAlign: "center",
                borderRadius: "4px",
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
              }}
            >
              Purchase Credits
            </Link>
            {/* New Link for Payment Methods */}
            <Link
              to="/payment-methods"
              style={{
                padding: "10px",
                textDecoration: "none",
                backgroundColor: "#6c757d",
                color: "white",
                textAlign: "center",
                borderRadius: "4px",
              }}
            >
              Payment Methods
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
              }}
            >
              Sign Out
            </button>
          </nav>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, padding: "20px" }}>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1>Welcome to the App</h1>
            {auth.isAuthenticated && <p>Welcome, {auth.user?.profile?.email}</p>}
            {!auth.isAuthenticated && (
              <button
                onClick={handleSignIn}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
            )}
          </header>

          {/* Routes */}
          <Routes>
            {!auth.isAuthenticated ? (
              <Route path="*" element={<Navigate to="/" replace />} />
            ) : (
              <>
                <Route
                  path="/dashboard"
                  element={<Dashboard userEmail={auth.user?.profile?.email} />}
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
                {/* New Route for Payment Methods */}
                <Route
                  path="/payment-methods"
                  element={<PaymentMethods token={auth.user?.id_token} />}
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </>
            )}
            <Route
              path="*"
              element={
                <div style={{ textAlign: "center", marginTop: "50px" }}>
                  <h2>404 - Page Not Found</h2>
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
