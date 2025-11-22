"use client";
import "./Profile.css";
import "@/app/globals.css";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { buildApiUrl } from "../../lib/apiClient";

export default function Profile() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [username, setUsername] = useState("User");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const darkPref = localStorage.getItem("theme") === "dark";
    setIsDarkMode(darkPref);
    document.documentElement.classList.toggle("dark", darkPref);

    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const openMenu = () => {
    setMessage("");
    setShowMenu((s) => !s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    const body = {};
    const u = usernameRef.current?.value?.trim();
    const em = emailRef.current?.value?.trim();
    const pw = passwordRef.current?.value;

    if (u && u !== username) body.username = u;
    if (em) body.email = em;
    if (pw) body.password = pw;

    if (Object.keys(body).length === 0) {
      setMessage("No changes to save");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/update-user"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.detail || json.message || "Update failed");
      } else {
        setMessage("Saved");
        if (json.username) {
          setUsername(json.username);
          localStorage.setItem("username", json.username);
        }
        if (passwordRef.current) passwordRef.current.value = "";
      }
    } catch (err) {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-wrapper">
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
        onClick={toggleDarkMode}
      >
        {isDarkMode ? (
          <Icon icon="solar:sun-bold-duotone" />
        ) : (
          <Icon icon="solar:moon-bold-duotone" />
        )}
      </button>

      <div className="profile-menu-container">
        <button className="profile-btn" onClick={openMenu} aria-haspopup="true" aria-expanded={showMenu}>
          <Icon icon="solar:user-circle-bold-duotone" />
        </button>

        {showMenu && (
          <div className="profile-dropdown" role="menu">
            <div className="profile-dropdown-header">
              <p className="greeting">Hello, <strong>{username}</strong></p>
            </div>

            <form className="profile-form" onSubmit={handleSubmit}>
              <label className="form-label">
                Username
                <input
                  ref={usernameRef}
                  defaultValue={username}
                  className="form-input"
                  placeholder="Username"
                  readOnly
                />
              </label>

              <label className="form-label">
                Email
                <input
                  ref={emailRef}
                  type="email"
                  className="form-input"
                  placeholder="New email"
                />
              </label>

              <label className="form-label">
                New password
                <input
                  ref={passwordRef}
                  type="password"
                  className="form-input"
                  placeholder="New password"
                />
              </label>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" className="cancel-btn" onClick={() => setShowMenu(false)}>
                  Close
                </button>
              </div>

              {message && <p className="form-message">{message}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
