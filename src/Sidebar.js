import React from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ onSignOut }) => {
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        boxShadow: "2px 0 5px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/search">Search</Link>
      <Link to="/purchase-credits">Purchase Credits</Link>
      <button
        onClick={onSignOut}
        style={{
          marginTop: "auto",
          padding: "10px 15px",
          backgroundColor: "#d9534f",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Sign Out
      </button>
    </nav>
  );
};

export default Sidebar;
