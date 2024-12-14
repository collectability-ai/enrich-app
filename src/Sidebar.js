import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Search, 
  CreditCard, 
  LogOut, 
  User 
} from "lucide-react";

const Sidebar = ({ email, onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (path) => {
    console.log("Attempting navigation to:", path);
    navigate(path);
  };

  const baseButtonStyle = {
    padding: "12px 16px",
    backgroundColor: "transparent",
    color: "#4a5568", // Dark gray for inactive
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
    fontWeight: "500",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "2px 0"
  };

  const activeButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: "#67cad8",
    color: "white"
  };

  const iconStyle = (isActive) => ({
    width: "18px",
    height: "18px",
    color: isActive ? "white" : "#4a5568"
  });

  return (
    <div style={{
      width: "280px",
      minWidth: "280px",
      backgroundColor: "#ffffff",
      height: "100vh",
      boxShadow: "2px 0px 5px rgba(0,0,0,0.1)",
      padding: "20px",
      position: "sticky",
      top: 0,
      left: 0,
      borderRight: "1px solid #e5e7eb",
      overflowY: "auto"
    }}>
      <div style={{ 
        marginBottom: "20px",
        display: "flex",
        justifyContent: "center"
      }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{
            width: "150px",
            height: "auto",
          }}
        />
      </div>

      <div style={{
        fontSize: "14px",
        color: "#4a5568",
        marginBottom: "24px",
        padding: "12px",
        backgroundColor: "#f8fafb",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <User style={{ width: "16px", height: "16px", color: "#67cad8" }} />
        <span>{email || "Guest"}</span>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "100%"
      }}>
        <button 
          onClick={() => handleNavigation("/dashboard")}
          style={location.pathname === "/dashboard" ? activeButtonStyle : baseButtonStyle}
        >
          <LayoutDashboard style={iconStyle(location.pathname === "/dashboard")} />
          <span style={{ flex: 1, textAlign: "left" }}>Dashboard</span>
        </button>

        <button 
          onClick={() => handleNavigation("/search")}
          style={location.pathname === "/search" ? activeButtonStyle : baseButtonStyle}
        >
          <Search style={iconStyle(location.pathname === "/search")} />
          <span style={{ flex: 1, textAlign: "left" }}>Search</span>
        </button>

        <button 
          onClick={() => handleNavigation("/purchase-credits")}
          style={location.pathname === "/purchase-credits" ? activeButtonStyle : baseButtonStyle}
        >
          <CreditCard style={iconStyle(location.pathname === "/purchase-credits")} />
          <span style={{ flex: 1, textAlign: "left" }}>Purchase Credits</span>
        </button>

        <div style={{ margin: "20px 0", borderTop: "1px solid #e5e7eb" }} />

        <button 
          onClick={() => {
            console.log("Sign out clicked");
            if (onSignOut) onSignOut();
          }}
          style={{
            ...baseButtonStyle,
            color: "#4a5568",
            ':hover': {
              backgroundColor: "#f3f4f6"
            }
          }}
        >
          <LogOut style={iconStyle(false)} />
          <span style={{ flex: 1, textAlign: "left" }}>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;