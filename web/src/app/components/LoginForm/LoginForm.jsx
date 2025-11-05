"use client";
import React, { useState } from "react";
import { buildApiUrl } from "../../lib/apiClient";
import "./LoginForm.css";

export default function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? "register" : "login";
      const payload = isRegister
        ? { username, email, password }
        : { username, password };

      const res = await fetch(buildApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        if (!isRegister) {
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
    <div className="login-container">
      <img src="/Logo.PNG" alt="Logo" className="logo" />

      <div className="form-wrapper">
        <form onSubmit={handleSubmit}>
          <h1>{isRegister ? "Register" : "Login"}</h1>

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

          <button type="submit" className="btn">
            {isRegister ? "Register" : "Login"}
          </button>

          {message && <p className="message">{message}</p>}

          <div className="register-link">
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
