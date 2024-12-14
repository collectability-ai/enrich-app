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

  useEffect(() => {
  const getToken = async () => {
    if (isLoggedIn) {
      try {
        const session = await fetchAuthSession();
        const idToken = session?.tokens?.idToken?.toString();
        setSessionToken(idToken);
        console.log("Fetched sessionToken:", idToken); // Debugging log
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

// Loading check: Ensure email and sessionToken are initialized
  if (isLoggedIn && (!email || !sessionToken)) {
    return <div>Loading...</div>;
  }

return (
 <div style={{ 
    background: "linear-gradient(to bottom right, #eef2f6, #d1dde9)",
    minHeight: "100vh",
    display: "flex",
    width: "100%",
    position: "relative"
  }}>

    {/* Background Overlay */}
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `url("/network-bg.svg")`,
      backgroundPosition: "center right",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      opacity: 0.25,  // Reduced opacity to 25%
      zIndex: 0
    }} />

{/* Sidebar Navigation */}
{isLoggedIn && (
  <Sidebar email={email} onSignOut={handleSignOut} />
)}
       
    {/* Main Content */}
    <div style={{ 
      position: "relative", 
      zIndex: 1, 
      flex: 1,
      padding: "20px"
    }}>
      <Routes>
        {/* Your existing Routes */}
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
);
};

export default App;