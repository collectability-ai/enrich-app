import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, signOut, fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import InputForm from "./InputForm";
import ResultsPage from "./ResultsPage";
import PurchaseCredits from "./PurchaseCredits";
import Signup from "./Signup";
import Login from "./Login";
import VerifyEmail from "./VerifyEmail";
import logger from './logger';
import "./aws-config";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sessionToken, setSessionToken] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Tracks the loading state
  const location = useLocation();

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobileView) {
      setIsSidebarOpen(false);
    }
  }, [location, isMobileView]);

  // Authentication token management
  useEffect(() => {
    const getToken = async () => {
      if (isLoggedIn) {
        try {
          const session = await fetchAuthSession();
          const idToken = session?.tokens?.idToken?.toString();
          setSessionToken(idToken);
          logger.log("Fetched sessionToken:", idToken);
} catch (error) {
  logger.error("Error getting session:", error);
          setSessionToken(null);
        }
      }
    };
    getToken();
  }, [isLoggedIn]);

  // Auth state management with loading fix
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await getCurrentUser();
        logger.log("Current user data:", userData);
        setIsLoggedIn(true);
        setEmail(userData.signInDetails?.loginId || userData.username);
      } catch (error) {
        logger.log("Not signed in");
        setIsLoggedIn(false);
        setEmail("");
        setSessionToken(null);
      } finally {
        setIsLoading(false); // Stop the loading spinner
      }
    };

    checkUser();

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      const { event } = payload;
      logger.log("Auth event:", event);

      if (event === "signedIn") {
        checkUser();
      } else if (event === "signedOut") {
        handleSignOut(true); // Avoid freezing by resetting state
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async (fromHub = false) => {
    try {
      if (!fromHub) {
        await signOut();
      }
      setIsLoggedIn(false);
      setEmail("");
      setSessionToken(null);
      logger.log("Signed out successfully");
    } catch (error) {
      logger.error("Error signing out:", error);
    } finally {
      setIsLoading(false); // Ensure loading state is cleared
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f6] relative">
      {/* Background Pattern */}
      <div
        className="fixed inset-0 z-0 bg-center bg-no-repeat bg-cover opacity-25"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/network-bg.svg)` }}
      />

      {/* Main Container */}
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar and Mobile Menu */}
        {isLoggedIn && (
          <>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors lg:hidden ${
                isSidebarOpen ? "left-[280px]" : "left-4"
              }`}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarOpen ? (
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

            {/* Sidebar */}
            <aside
              className={`fixed lg:static lg:translate-x-0 z-40 transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <Sidebar
                email={email}
                onSignOut={() => handleSignOut(false)} // Explicitly pass false
                isCollapsed={!isSidebarOpen}
                setIsCollapsed={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </aside>

            {/* Mobile Overlay */}
            {isMobileView && isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
          </>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
            isMobileView ? "px-4" : "px-8"
          }`}
        >
          <div className="py-6">
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
        </main>
      </div>
    </div>
  );
};

export default App;
