"use client";
import React, { useEffect, useState } from "react";
import { buildApiUrl } from "../../lib/apiClient";
import "@/app/globals.css"; 
import "./LoginForm.css";

export default function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true });
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? "register" : "login";
      const payload = isRegister
        ? { username, email, password }
        : { username, password };

      const res = await fetch(buildApiUrl(endpoint), {
        method: "POST",
        credentials: "include", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        if (!isRegister) {
          // Save username locally for UI.
          //the server also sets an HttpOnly cookie named `session_user`
          localStorage.setItem("username", username);
          window.location.href = "/dashboard";
        } else {
          setIsRegister(false);
        }
      } else {
        setMessage(data.detail || "Request failed");
      }
    } catch (err) {
      setMessage("Network error");
    }
  };

  return (
    <div className="login-page">  
      <div className="brand-header">
        <img
          src={isDark ? "/Logo_dark.PNG" : "/Logo.PNG"}
          alt="Pennysworthe Logo"
          className="brand-logo"
        />
        <h2 className="brand-name">Pennysworthe</h2>
      </div>

      <div className="form-card">
        <h1 className="form-title">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="form-subtitle">
          {isRegister ? "Sign up" : "Sign in"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-box">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-box">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            {isRegister ? "Register" : "Login"}
          </button>

          {message && <p className="message">{message}</p>}

          <div className="toggle-text">
            {isRegister ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="link-button"
                >
                  Login
                </button>
              </p>
            ) : (
              <p>
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="link-button"
                >
                  Register
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}