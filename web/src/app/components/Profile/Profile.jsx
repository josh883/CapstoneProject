"use client";
import "./Profile.css";
import "@/app/globals.css";
import { useState, useEffect } from "react";
import { Moon, Sun, User } from "lucide-react";

export default function Profile() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const darkPref = localStorage.getItem("theme") === "dark";
    setIsDarkMode(darkPref);
    document.documentElement.classList.toggle("dark", darkPref);
  }, []);

  // Toggle dark mode and save preference
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  return (
    <div className="profile-wrapper">
      <button className="theme-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="profile-menu-container">
        <button className="profile-btn" onClick={() => setShowMenu(!showMenu)}>
          <User size={20} />
        </button>

        {showMenu && (
          <div className="profile-dropdown">
            <p>Hello, <strong>User</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}
