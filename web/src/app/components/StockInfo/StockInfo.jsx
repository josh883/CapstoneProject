"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl } from "../../lib/apiClient";
import Chart from "chart.js/auto";
import "@/app/globals.css";
import "./StockInfo.css";

// Frontend default settings, matches backend
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

// Modern SVG RiskGauge
const RiskGauge = ({ probability }) => {
  const score = Math.min(Math.max(probability, 0), 100);

  let color = "#f59e0b";
  if (score >= 60) color = "#16a34a";
  if (score <= 40) color = "#dc2626";

  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="gauge-wrapper">
      <div className="gauge-svg-container">
        <svg viewBox="0 0 200 110" className="gauge-svg">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Gradient arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Needle */}
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "100px 100px",
              transition: "transform 1s ease-out",
            }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="25"
              stroke="var(--color-text-primary)"
              strokeWidth="4"
            />
            <circle cx="100" cy="100" r="6" fill="var(--color-text-primary)" />
          </g>

          {/* Labels */}
          <text
            x="20"
            y="125"
            className="gauge-label"
            textAnchor="start"
          >
            0
          </text>
          <text
            x="180"
            y="125"
            className="gauge-label"
            textAnchor="end"
          >
            100
          </text>
        </svg>
      </div>

      <div className="gauge-value" style={{ color }}>
        {Math.round(score)}%
      </div>
    </div>
  );
};

export default function StockInfo() {
  const { symbol } = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");

  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const [isSentimentLoading, setIsSentimentLoading] = useState(true);

  const [analysis, setAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

  const [crossStatus, setCrossStatus] = useState(null);

  const [username, setUsername] = useState("testuser");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("username");
      if (storedUser) setUsername(storedUser);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/stock/${search.toUpperCase()}`);
    }
  };

  // Load user settings
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
        setSettingsLoaded(true);
      }
    }
    loadSettings();
  }, []);

  // Fetch price data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          buildApiUrl(
            `/prices?function=TIME_SERIES_DAILY&symbol=${symbol}`
          )
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || "Fetch error");
        setData(json);
      } catch (e) {
        setErr(e.message);
      }
    }
    if (symbol) {
      fetchData();
    }
  }, [symbol]);

  // Fetch golden/death cross status, only if enabled
  useEffect(() => {
    async function fetchCross() {
      try {
        const res = await fetch(
          buildApiUrl(`/sma_status?symbol=${symbol}`)
        );
        const json = await res.json();
        setCrossStatus(json.status);
      } catch (e) {
        setCrossStatus("Could not determine cross status");
      }
    }

    if (!symbol) return;
    if (!settingsLoaded) return;

    if (!settings.enable_golden_cross) {
      setCrossStatus(null);
      return;
    }

    fetchCross();
  }, [symbol, settingsLoaded, settings.enable_golden_cross]);

  // Fetch analysis data once settings are loaded
  useEffect(() => {
    async function fetchAnalysis() {
      if (!symbol) return;
      setIsAnalysisLoading(true);
      try {
        const res = await fetch(
          buildApiUrl(`/analysis/${symbol.toUpperCase()}`)
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || "Analysis fetch error");
        setAnalysis(json);
      } catch (e) {
        console.error("Failed to fetch analysis", e);
        setAnalysis(null);
      } finally {
        setIsAnalysisLoading(false);
      }
    }

    if (!symbol) return;
    if (!settingsLoaded) return;

    fetchAnalysis();
  }, [symbol, settingsLoaded]);

  // Check watchlist
  useEffect(() => {
    async function checkWatchlist() {
      try {
        const res = await fetch(buildApiUrl("/watchlist"), {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        setIsInWatchlist(json.watchlist?.includes(symbol.toUpperCase()));
      } catch {
        // ignore
      }
    }
    if (symbol) {
      checkWatchlist();
    }
  }, [symbol]);

  const handleWatchlistToggle = async () => {
    try {
      const method = isInWatchlist ? "DELETE" : "POST";
      let res;

      if (method === "POST") {
        res = await fetch(buildApiUrl("/watchlist"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: symbol.toUpperCase() }),
        });
      } else {
        res = await fetch(
          buildApiUrl(`/watchlist/${symbol.toUpperCase()}`),
          {
            method: "DELETE",
            credentials: "include",
          }
        );
      }

      const json = await res.json();
      if (res.ok) {
        setIsInWatchlist(!isInWatchlist);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function fetchSentiment() {
      if (!symbol) return;
      setIsSentimentLoading(true);
      try {
        const res = await fetch(
          buildApiUrl(`/sentiment/${symbol.toUpperCase()}`)
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || "Sentiment fetch error");
        setSentiment(json);
      } catch (e) {
        console.error("Failed to fetch sentiment", e);
        setSentiment(null);
      } finally {
        setIsSentimentLoading(false);
      }
    }

    if (!symbol) return;
    if (!settingsLoaded) return;

    if (!settings.enable_trend_sentiment) {
      setSentiment(null);
      setIsSentimentLoading(false);
      return;
    }

    fetchSentiment();
  }, [symbol, settingsLoaded, settings.enable_trend_sentiment]);

  useEffect(() => {
    if (!data?.rows) return;

    const renderChart = () => {
      const ctx = document.getElementById("priceChart");
      if (!ctx) return;

      if (window.stockChart) window.stockChart.destroy();

      const historyDays = settings.chart_history_days || 30;
      const recentRows = data.rows.slice(-historyDays);

      const labels = recentRows.map((r) => r.timestamp.split("T")[0]);
      const closePrices = recentRows.map((r) => r.close);
      const lastDateStr = labels[labels.length - 1];

      let predictionPoint = [];
      let predictionLabels = labels;

      const hasPrediction =
        analysis &&
        analysis.prediction &&
        analysis.prediction.next_day_price;

      if (
        hasPrediction &&
        settings.enable_ai_prediction &&
        settings.show_prediction_marker
      ) {
        const predPrice = analysis.prediction.next_day_price;

        const lastDate = new Date(lastDateStr);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        if (nextDate.getDay() === 6) nextDate.setDate(nextDate.getDate() + 2);
        if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);

        const nextDateString = nextDate.toISOString().split("T")[0];

        predictionPoint = new Array(closePrices.length).fill(null);
        predictionPoint.push(predPrice);

        predictionLabels = [...labels, `Forecast (${nextDateString})`];
      }

      const isDarkMode =
        document.documentElement.classList.contains("dark");
      const styles = getComputedStyle(document.documentElement);

      const primaryColor = isDarkMode
        ? "#c084fc"
        : styles.getPropertyValue("--color-primary").trim() || "#4f46e5";

      const surfaceColor = isDarkMode
        ? "rgba(192,132,252,0.25)"
        : "rgba(79,70,229,0.1)";

      const textColor = isDarkMode ? "#ffffff" : "#111827";
      const gridColor = isDarkMode
        ? "rgba(255,255,255,0.18)"
        : "rgba(0,0,0,0.1)";

      const predictionColor = "#f59e0b";

      window.stockChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: predictionLabels,
          datasets: [
            {
              label: "History",
              data: closePrices,
              borderColor: primaryColor,
              backgroundColor: settings.show_chart_fill
                ? surfaceColor
                : "transparent",
              tension: 0.3,
              fill: settings.show_chart_fill,
              pointRadius: 2,
            },
            ...(hasPrediction &&
            settings.enable_ai_prediction &&
            settings.show_prediction_marker
              ? [
                  {
                    label: "AI Forecast",
                    data: predictionPoint,
                    borderColor: predictionColor,
                    backgroundColor: predictionColor,
                    pointStyle: "star",
                    pointRadius: 8,
                    borderWidth: 2,
                    showLine: false,
                  },
                ]
              : []),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          scales: {
            x: {
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
          },
          plugins: {
            legend: {
              labels: { color: textColor },
            },
          },
        },
      });
    };

    const observer = new MutationObserver(() => {
      setTimeout(renderChart, 50);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    setTimeout(renderChart, 150);

    return () => {
      if (window.stockChart) window.stockChart.destroy();
      observer.disconnect();
    };
  }, [
    data,
    symbol,
    analysis,
    settings.chart_history_days,
    settings.show_chart_fill,
    settings.enable_ai_prediction,
    settings.show_prediction_marker,
  ]);

  const StockAnalysis = () => {
    if (
      (settings.enable_ai_prediction ||
        settings.enable_volatility ||
        settings.enable_beta ||
        settings.enable_signal_gauge) &&
      isAnalysisLoading
    ) {
      return (
        <div className="analysis-loading">
          Loading AI analysis...
        </div>
      );
    }

    if (settings.enable_trend_sentiment && isSentimentLoading) {
      return (
        <div className="analysis-loading">
          Loading sentiment...
        </div>
      );
    }

    if (!analysis && !sentiment && !crossStatus) {
      return null;
    }

    const { prediction, risk } = analysis || {};
    const currentClose = data?.rows.slice(-1)[0]?.close;

    let gaugeVal = 50;
    if (settings.enable_signal_gauge) {
      const rawGauge = prediction?.gauge_score;
      gaugeVal =
        typeof rawGauge === "number" ? rawGauge : 50;
    }

    const getSentimentColor = (pred) => {
      if (pred === "Bullish") return "positive";
      if (pred === "Bearish") return "negative";
      return "neutral";
    };

    return (
      <div className="stock-analysis-container">
        {(settings.enable_volatility || settings.enable_beta) &&
          analysis && (
            <div className="analysis-card">
              <h3 className="analysis-title">Historical Risk</h3>

              {settings.enable_volatility && (
                <div className="analysis-row">
                  <span>Volatility:</span>
                  <span
                    className={`risk-badge risk-${risk?.volatility
                      ?.toLowerCase?.() || "unknown"}`}
                  >
                    {risk?.volatility || "Unknown"}
                  </span>
                </div>
              )}

              {settings.enable_beta && (
                <div className="analysis-row">
                  <span>Beta (vs. SPY):</span>
                  <strong>{risk?.beta ?? "N/A"}</strong>
                </div>
              )}

              <small>Based on past 1 year behavior.</small>
            </div>
          )}

        {/* AI Price Forecast */}
        {settings.enable_ai_prediction && prediction && (
          <div className="analysis-card">
            <h3 className="analysis-title">AI Price Forecast</h3>
            <div className="analysis-row">
              <span>Next Close:</span>
              <strong className="prediction-price">
                $
                {prediction.next_day_price
                  ? prediction.next_day_price.toFixed(2)
                  : "N/A"}
              </strong>
            </div>
            {currentClose && prediction.next_day_price && (
              <p
                className={`prediction-diff ${
                  prediction.next_day_price > currentClose
                    ? "positive"
                    : "negative"
                }`}
              >
                {prediction.next_day_price > currentClose
                  ? "▲"
                  : "▼"}{" "}
                from ${currentClose.toFixed(2)}
              </p>
            )}
            <small>RNN model prediction. Not financial advice.</small>
          </div>
        )}

        {/* Signal Gauge */}
        {settings.enable_signal_gauge && (
          <div className="analysis-card gauge-card">
            <h3
              className="analysis-title"
              style={{ marginBottom: "0.5rem", border: "none" }}
            >
              Signal Strength
            </h3>
            <RiskGauge probability={gaugeVal} />
            <small style={{ textAlign: "center", marginTop: 0 }}>
              Predicted move intensity
            </small>
          </div>
        )}

        {/* Trend Sentiment */}
        {settings.enable_trend_sentiment && sentiment && (
          <div className="analysis-card">
            <h3 className="analysis-title">Price Trend Sentiment</h3>
            <div className="analysis-row">
              <span>Sentiment:</span>
              <strong
                className={`sentiment-badge ${getSentimentColor(
                  sentiment.prediction
                )}`}
              >
                {sentiment.prediction}
              </strong>
            </div>
            <div className="analysis-row">
              <span>Trend Score:</span>
              <strong>{sentiment.score}</strong>
            </div>
            <small>{sentiment.message}</small>
          </div>
        )}

        {/* Watchlist card, always visible */}
        <div className="analysis-card watchlist-card">
          <h3 className="analysis-title">Watchlist</h3>
          <button
            className="watchlist-btn inside-card"
            onClick={handleWatchlistToggle}
          >
            {isInWatchlist
              ? "Remove from Watchlist"
              : "Add to Watchlist"}
          </button>
          <small style={{ textAlign: "center" }}>
            Track this stock in your personalized watchlist.
          </small>
        </div>

        {/* Golden / Death Cross */}
        {settings.enable_golden_cross && crossStatus && (
          <div className="analysis-card">
            <h3 className="analysis-title">Simple Moving Average</h3>

            <div className="cross-visual">
              {crossStatus.includes("Golden") ? (
                <svg width="50" height="30">
                  <path
                    d="M5 25 L45 5"
                    stroke="#16a34a"
                    strokeWidth="3"
                  />
                  <path
                    d="M5 5 L45 25"
                    stroke="#9ca3af"
                    strokeWidth="3"
                  />
                </svg>
              ) : (
                <svg width="50" height="30">
                  <path
                    d="M5 5 L45 25"
                    stroke="#dc2626"
                    strokeWidth="3"
                  />
                  <path
                    d="M5 25 L45 5"
                    stroke="#9ca3af"
                    strokeWidth="3"
                  />
                </svg>
              )}
            </div>

            <div
              className="analysis-row"
              style={{ marginTop: "6px" }}
            >
              <span>Status:</span>
              <strong
                className={
                  crossStatus.includes("Golden")
                    ? "sentiment-badge positive"
                    : crossStatus.includes("Death")
                    ? "sentiment-badge negative"
                    : "sentiment-badge neutral"
                }
                style={{ fontSize: "0.9rem" }}
              >
                {crossStatus.includes("Golden")
                  ? "Golden Cross"
                  : crossStatus.includes("Death")
                  ? "Death Cross"
                  : "Neutral"}
              </strong>
            </div>

            <small>
              This indicator compares the 20 day SMA and 80 day SMA to
              detect shifts in long term trend momentum.
            </small>
          </div>
        )}
      </div>
    );
  };

  if (err) return <div className="error-text">Error: {err}</div>;
  if (!data) return <div className="loading-text">Loading...</div>;

  const meta = data.meta;
  const rows = data.rows.slice(-10);

  return (
    <div className="stock-container">
      <h1 className="stock-header">
        {symbol.toUpperCase()} Stock Data
      </h1>

      <div className="stock-meta">
        <p>
          <strong>Symbol:</strong> {meta.symbol}
        </p>
        <p>
          <strong>Last Refreshed:</strong> {meta.last_refreshed}
        </p>
        <p>
          <strong>Time Zone:</strong> {meta.time_zone}
        </p>
        {meta.interval && (
          <p>
            <strong>Interval:</strong> {meta.interval}
          </p>
        )}
      </div>

      <StockAnalysis />

      <div className="table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Open</th>
              <th>Close</th>
              <th>High / Low</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.timestamp}>
                <td>{r.timestamp.split("T")[0]}</td>
                <td>{r.open.toFixed(2)}</td>
                <td
                  className={
                    r.close >= r.open ? "positive" : "negative"
                  }
                >
                  {r.close.toFixed(2)}
                </td>
                <td>
                  {r.high.toFixed(2)} / {r.low.toFixed(2)}
                </td>
                <td>{r.volume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-container">
        <canvas id="priceChart" width="700" height="400"></canvas>
      </div> 
    </div>   
  );
}
