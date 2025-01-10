import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import Sidebar from "./Sidebar";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      if (isLoggedIn) {
        try {
          const session = await fetchAuthSession();
          const idToken = session?.tokens?.idToken?.toString();
          setSessionToken(idToken);
          console.log("Fetched sessionToken:", idToken);
        } catch (error) {
          console.error("Error getting session:", error);
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

  if (isLoggedIn && (!email || !sessionToken)) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen w-full relative bg-gradient-to-br from-[#eef2f6] to-[#d1dde9]">
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url(./network-bg.svg)",
        backgroundPosition: "center right",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        opacity: 0.25,
        zIndex: 0
      }} />

      {isLoggedIn && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      )}

      {isLoggedIn && (
        <div
          className={`fixed lg:static inset-0 z-40 transform ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
          <Sidebar email={email} onSignOut={handleSignOut} />
        </div>
      )}

      <div className="flex-1 relative z-10 p-5 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route
              path="/"
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <Navigate to="/signup" />}
            />
            <Route
              path="/signup"
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <Signup />}
            />
            <Route
              path="/login"
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login />}
            />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route
              path="/dashboard"
              element={
                isLoggedIn ? (
                  <Dashboard token={sessionToken} email={email} />
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
                isLoggedIn ? (
                  <PurchaseCredits userEmail={email} token={sessionToken} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/results"
              element={isLoggedIn ? <ResultsPage /> : <Navigate to="/login" />}
            />
            <Route
              path="*"
              element={<Navigate to={isLoggedIn ? "/dashboard" : "/signup"} replace />}
            />
          </Routes>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default App;