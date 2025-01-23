import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Search, 
  CreditCard, 
  LogOut,
  Menu,
  User
} from "lucide-react";

const Sidebar = ({ email, onSignOut, isCollapsed, setIsCollapsed }) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [location, isMobile]);
  
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setIsCollapsed(true);
    }
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
          <span className="ml-3 whitespace-nowrap">{text}</span>
        )}
      </button>
    );
  };

  return (
    <div 
  className={`h-screen fixed lg:sticky top-0 flex flex-col bg-[#141726] transition-all duration-300 ease-in-out ${
    isCollapsed && isMobile ? '-translate-x-full' : 'translate-x-0'
  }`}
  style={{
    width: isCollapsed ? "64px" : "280px",
    zIndex: 50
  }}
>
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
  {/* Only show this button on larger screens */}
  <button
    onClick={() => setIsCollapsed(!isCollapsed)}
    className="p-2 text-white hover:text-gray-300 hidden lg:block" // Added hidden lg:block
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
            <span className="ml-3 whitespace-nowrap">Sign Out</span>
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {!isCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          style={{ marginLeft: "280px" }}
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </div>
  );
};

export default Sidebar;