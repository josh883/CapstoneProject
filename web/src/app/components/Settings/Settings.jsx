"use client";
import { useEffect, useState } from "react";
import { buildApiUrl } from "../../lib/apiClient";
import "./Settings.css";

const DEFAULT_SETTINGS = {
  enable_ai_prediction: true,
  enable_trend_sentiment: true,
  enable_golden_cross: true,
  enable_volatility: true,
  enable_beta: true,
  enable_signal_gauge: true,
  risk_sensitivity: 50,
  prediction_weight: 50,
  smoothing_factor: 30,
  chart_history_days: 30,
  show_chart_fill: true,
  show_prediction_marker: true,
};

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(buildApiUrl("/settings"), {
          credentials: "include",
        });
        const json = await res.json();
        if (res.ok && json.settings) {
          setSettings((prev) => ({
            ...prev,
            ...json.settings,
          }));
        }
      } catch {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSlider = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const handleHistoryChange = (value) => {
    setSettings((prev) => ({
      ...prev,
      chart_history_days: Number(value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(buildApiUrl("/settings"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      setSaveMessage(res.ok && json.status === "ok" 
        ? "Settings saved." 
        : "Could not save settings."
      );
    } catch {
      setSaveMessage("Could not save settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">

      <div className="settings-header">
        <div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">
            Control which tools appear on the stock page and how sensitive they are.
          </p>
        </div>
      </div>

      <div className="settings-grid">

        {/* Algorithms */}
        <section className="settings-section-card">
          <h2 className="section-title">Algorithms</h2>
          <p className="section-caption">
            Turn each analysis block on or off for the stock page.
          </p>

          {[
            ["AI Price Prediction", "Shows the next day price forecast and difference from today.", "enable_ai_prediction"],
            ["Trend Sentiment", "Shows the recent price trend as bullish, bearish, or neutral.", "enable_trend_sentiment"],
            ["Golden / Death Cross", "Compares 20 and 80 day SMAs to detect long term trend shifts.", "enable_golden_cross"],
            ["Historical Volatility", "Shows low, medium, or high volatility for the past year.", "enable_volatility"],
            ["Beta vs SPY", "Shows how strongly the stock moves with the market.", "enable_beta"],
            ["Signal Gauge", "Shows the combined model signal on the gauge meter.", "enable_signal_gauge"],
          ].map(([label, desc, key]) => (
            <div className="setting-row" key={key}>
              <div className="setting-text">
                <div className="setting-label">{label}</div>
                <div className="setting-description">{desc}</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => handleToggle(key)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </section>

        {/* Tuning */}
        <section className="settings-section-card">
          <h2 className="section-title">Tuning</h2>
          <p className="section-caption">Adjust how sensitive the tools are.</p>

          {[
            ["Risk sensitivity", "Higher values show more aggressive risk warnings.", "risk_sensitivity"],
            ["Prediction strength", "Controls how strongly the AI forecast influences the gauge.", "prediction_weight"],
            ["Trend smoothing", "Higher values make trend sentiment slower to change.", "smoothing_factor"],
          ].map(([label, desc, key]) => (
            <div className="setting-row vertical" key={key}>
              <div className="setting-text">
                <div className="setting-label">{label}</div>
                <div className="setting-description">{desc}</div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings[key]}
                onChange={(e) => handleSlider(key, e.target.value)}
              />
              <div className="setting-value">{settings[key]}</div>
            </div>
          ))}

          <div className="setting-row vertical">
            <div className="setting-text">
              <div className="setting-label">Chart history</div>
              <div className="setting-description">
                Number of days of price history to show in the chart.
              </div>
            </div>
            <select
              value={settings.chart_history_days}
              onChange={(e) => handleHistoryChange(e.target.value)}
            >
              <option value={15}>15 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={120}>120 days</option>
            </select>
          </div>
        </section>

        {/* Display */}
        <section className="settings-section-card">
          <h2 className="section-title">Display</h2>
          <p className="section-caption">Control how the main price chart looks.</p>

          {[
            ["Chart fill", "Fills the price chart area under the line.", "show_chart_fill"],
            ["Prediction marker", "Shows the next day prediction star point on the chart.", "show_prediction_marker"],
          ].map(([label, desc, key]) => (
            <div className="setting-row" key={key}>
              <div className="setting-text">
                <div className="setting-label">{label}</div>
                <div className="setting-description">{desc}</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => handleToggle(key)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </section>
      </div>

      <div className="settings-footer">
        {saveMessage && <span className="save-message">{saveMessage}</span>}
        <button className="save-button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
