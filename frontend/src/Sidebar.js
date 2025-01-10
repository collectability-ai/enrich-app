import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Search, 
  CreditCard, 
  LogOut,
  Menu,
  User
} from "lucide-react";

const Sidebar = ({ email, onSignOut }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (path) => {
    navigate(path);
  };

  const navButton = (path, icon, text) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => handleNavigation(path)}
        className="flex items-center w-full p-3 rounded-md transition-colors"
        style={{
          backgroundColor: isActive ? "#67cad8" : "transparent",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ 
          width: "24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          {icon}
        </div>
        {!isCollapsed && (
          <span className="ml-3">{text}</span>
        )}
      </button>
    );
  };

  return (
    <div className="h-screen sticky top-0 flex flex-col"
      style={{
        width: isCollapsed ? "64px" : "280px",
        backgroundColor: "#141726",
        transition: "width 0.3s ease"
      }}>
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <img
            src="/logo_wht.png"
            alt="Logo"
            style={{
              height: "32px",
              width: "auto"
            }}
          />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-white hover:text-gray-300"
          style={{
            marginLeft: isCollapsed ? "0" : "auto",
            background: "transparent",
            border: "none",
            cursor: "pointer"
          }}
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex-1 px-2 py-4">
        {navButton("/dashboard", <LayoutDashboard size={20} />, "Dashboard")}
        {navButton("/search", <Search size={20} />, "Search")}
        {navButton("/purchase-credits", <CreditCard size={20} />, "Purchase Credits")}
      </div>

      <div className="mt-auto p-2 border-t border-gray-700">
        <div className="flex items-center p-3 mb-2 rounded-md bg-gray-800/50">
          <User size={20} className="text-white" />
          {!isCollapsed && (
            <span className="ml-3 text-sm text-white truncate">
              {email}
            </span>
          )}
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center w-full p-3 text-white rounded-md hover:bg-gray-800/50"
          style={{
            border: "none",
            cursor: "pointer",
            background: "transparent"
          }}
        >
          <div style={{ 
            width: "24px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <LogOut size={20} />
          </div>
          {!isCollapsed && (
            <span className="ml-3">Sign Out</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;