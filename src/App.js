import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import Dashboard from "./Dashboard";
import InputForm from "./InputForm";
import ResultsPage from "./ResultsPage";
import PurchaseCredits from "./PurchaseCredits";
import Signup from "./Signup";
import Login from "./Login";
import VerifyEmail from "./VerifyEmail";
import './aws-config';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      if (isLoggedIn) {
        try {
          const session = await fetchAuthSession();
          setSessionToken(session?.tokens?.idToken?.toString());
        } catch (error) {
          console.error('Error getting session:', error);
          setSessionToken(null);
        }
      }
    };
    getToken();
  }, [isLoggedIn]);

  useEffect(() => {
    checkUser();

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      const { event } = payload;
      console.log('Auth event:', event);
      
      if (event === 'signedIn') {
        checkUser();
      } else if (event === 'signedOut') {
        setIsLoggedIn(false);
        setEmail("");
        setSessionToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await getCurrentUser();
      console.log('Current user data:', userData);
      setIsLoggedIn(true);
      setEmail(userData.signInDetails?.loginId || userData.username);
    } catch (error) {
      console.log('Not signed in');
      setIsLoggedIn(false);
      setEmail("");
      setSessionToken(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsLoggedIn(false);
      setEmail("");
      setSessionToken(null);
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar Navigation */}
      {isLoggedIn && (
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

          <div
            style={{
              fontSize: "14px",
              color: "#333",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {email || "Guest"}
          </div>

          <Link to="/dashboard" style={linkStyle}>
            Dashboard
          </Link>
          <Link to="/search" style={linkStyle}>
            Search
          </Link>
          <Link to="/purchase-credits" style={linkStyle}>
            Purchase Credits
          </Link>

          <button onClick={handleSignOut} style={buttonStyle}>
            Sign Out
          </button>
        </nav>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/signup" />
              )
            }
          />
          <Route
            path="/signup"
            element={isLoggedIn ? <Navigate to="/dashboard" /> : <Signup />}
          />
          <Route
            path="/login"
            element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/verify"
            element={<VerifyEmail />}
          />
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <Dashboard token={sessionToken} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/search"
            element={
              isLoggedIn ? <InputForm userEmail={email} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/purchase-credits"
            element={
              isLoggedIn ? <PurchaseCredits userEmail={email} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/results"
            element={isLoggedIn ? <ResultsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="*"
            element={
              <Navigate to={isLoggedIn ? "/dashboard" : "/signup"} replace />
            }
          />
        </Routes>
      </div>
    </div>
  );
};

const linkStyle = {
  padding: "10px",
  textDecoration: "none",
  backgroundColor: "#67cad8",
  color: "white",
  textAlign: "center",
  borderRadius: "4px",
  width: "100%",
};

const buttonStyle = {
  padding: "10px",
  backgroundColor: "#67cad8",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  width: "100%",
};

export default App;