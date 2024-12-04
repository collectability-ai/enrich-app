import React from "react";

const Sidebar = ({ userEmail }) => {
  return (
    <div
      style={{
        width: "250px",
        backgroundColor: "#f8f9fa",
        height: "100vh",
        boxShadow: "2px 0px 5px rgba(0,0,0,0.1)",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
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

      {/* Logged-in user email */}
      <div
        style={{
          textAlign: "center",
          fontSize: "14px",
          color: "#333",
          marginTop: "10px",
        }}
      >
        <p>{userEmail}</p>
      </div>
    </div>
  );
};

export default Sidebar;
