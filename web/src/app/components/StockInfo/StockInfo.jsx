"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl } from "../../lib/apiClient";
import Chart from "chart.js/auto";
import "@/app/globals.css";
import "./StockInfo.css";

// --- 1. Define the Modern SVG RiskGauge ---
const RiskGauge = ({ probability }) => {
  // Ensure value is between 0 and 100
  const score = Math.min(Math.max(probability, 0), 100);
  
  // Determine dynamic color
  let color = "#f59e0b"; // Orange (Neutral)
  if (score >= 60) color = "#16a34a"; // Green (High/Buy)
  if (score <= 40) color = "#dc2626"; // Red (Low/Sell)

  // Calculate needle rotation: 0% = -90deg, 100% = 90deg
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="gauge-wrapper">
      <div className="gauge-svg-container">
        <svg viewBox="0 0 200 110" className="gauge-svg">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />   {/* Red */}
              <stop offset="50%" stopColor="#f59e0b" />  {/* Orange */}
              <stop offset="100%" stopColor="#16a34a" /> {/* Green */}
            </linearGradient>
          </defs>

          {/* Background Track (Gray) */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Colored Value Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Needle */}
          <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "100px 100px", transition: "transform 1s ease-out" }}>
            <line x1="100" y1="100" x2="100" y2="25" stroke="var(--color-text-primary)" strokeWidth="4" />
            <circle cx="100" cy="100" r="6" fill="var(--color-text-primary)" />
          </g>

          {/* Labels */}
          <text x="20" y="125" className="gauge-label" textAnchor="start">0</text>
          <text x="180" y="125" className="gauge-label" textAnchor="end">100</text>
        </svg>
      </div>
      
      <div className="gauge-value" style={{ color: color }}>
        {Math.round(score)}%
      </div>
    </div>
  );
};

export default function StockInfo() {
  const { symbol } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  
  // Analysis State
  const [analysis, setAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

  const router = useRouter();

  const [username, setUsername] = useState("testuser");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("username");
      if (storedUser) setUsername(storedUser);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) router.push(`/stock/${search.toUpperCase()}`);
  };

  // Fetch Price Data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          buildApiUrl(`/prices?function=TIME_SERIES_DAILY&symbol=${symbol}`)
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || "Fetch error");
        setData(json);
      } catch (e) {
        setErr(e.message);
      }
    }
    fetchData();
  }, [symbol]);

  // Fetch Analysis Data
  useEffect(() => {
    async function fetchAnalysis() {
      if (!symbol) return;
      setIsAnalysisLoading(true);
      try {
        const res = await fetch(buildApiUrl(`/analysis/${symbol.toUpperCase()}`));
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
    fetchAnalysis();
  }, [symbol]);

  // Check Watchlist
  useEffect(() => {
    async function checkWatchlist() {
      try {
        const res = await fetch(buildApiUrl(`/watchlist`), {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        setIsInWatchlist(json.watchlist?.includes(symbol.toUpperCase()));
      } catch {}
    }
    checkWatchlist();
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
        res = await fetch(buildApiUrl(`/watchlist/${symbol.toUpperCase()}`), {
          method: "DELETE",
          credentials: "include",
        });
      }

      const json = await res.json();
      if (res.ok) {
        setIsInWatchlist(!isInWatchlist);
      }
    } catch (e) {
      // ignore error
    }
  };

  // --- 2. Chart Logic ---
  useEffect(() => {
    if (!data?.rows) return;
    const renderChart = () => {
      const ctx = document.getElementById("priceChart");
      if (!ctx) return;

      if (window.stockChart) window.stockChart.destroy();

      const recentRows = data.rows.slice(-30);
      const labels = recentRows.map((r) => r.timestamp.split("T")[0]);
      const closePrices = recentRows.map((r) => r.close);
      const lastDateStr = labels[labels.length - 1];

      let predictionPoint = [];
      let predictionLabels = [];

      if (analysis && analysis.prediction && analysis.prediction.next_day_price) {
        const predPrice = analysis.prediction.next_day_price;
        
        const lastDate = new Date(lastDateStr);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        if (nextDate.getDay() === 6) nextDate.setDate(nextDate.getDate() + 2); 
        if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);
        
        const nextDateString = nextDate.toISOString().split('T')[0];

        predictionPoint = new Array(closePrices.length).fill(null);
        predictionPoint.push(predPrice);
        
        predictionLabels = [...labels, "Forecast (" + nextDateString + ")"];
      } else {
        predictionLabels = labels;
      }

      const isDarkMode = document.documentElement.classList.contains("dark");
      const styles = getComputedStyle(document.documentElement);
      const primaryColor = isDarkMode ? "#a78bfa" : styles.getPropertyValue("--color-primary").trim() || "#4f46e5";
      const surfaceColor = isDarkMode ? "rgba(167,139,250,0.15)" : "rgba(79,70,229,0.1)";
      const textColor = isDarkMode ? "#e5e7eb" : "#111827";
      const gridColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
      const predictionColor = "#f59e0b"; 

      window.stockChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: predictionLabels,
          datasets: [
            {
              label: `History`,
              data: closePrices,
              borderColor: primaryColor,
              backgroundColor: surfaceColor,
              tension: 0.3,
              fill: true,
              pointRadius: 2,
            },
            {
              label: `AI Forecast`,
              data: predictionPoint,
              borderColor: predictionColor,
              backgroundColor: predictionColor,
              pointStyle: 'star',
              pointRadius: 8, 
              borderWidth: 2,
              showLine: false, 
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } },
          },
          plugins: { legend: { labels: { color: textColor } } },
        },
      });
    };

    setTimeout(renderChart, 150);
    return () => {
      if (window.stockChart) window.stockChart.destroy();
    };
  }, [data, symbol, analysis]);

  // --- 3. Analysis Layout ---
  const StockAnalysis = () => {
    if (isAnalysisLoading) {
      return <div className="analysis-loading">Loading AI analysis...</div>;
    }
    if (!analysis) {
      return null; 
    }

    const { prediction, risk } = analysis;
    const currentClose = data?.rows.slice(-1)[0]?.close;
    const gaugeVal = prediction.gauge_score ?? 50; 

    return (
      <div className="stock-analysis-container">
        {/* Card 1: Historical Risk */}
        <div className="analysis-card">
          <h3 className="analysis-title">Historical Risk</h3>
          <div className="analysis-row">
            <span>Volatility:</span>
            <span className={`risk-badge risk-${risk.volatility?.toLowerCase()}`}>
              {risk.volatility}
            </span>
          </div>
          <div className="analysis-row">
            <span>Beta (vs. SPY):</span>
            <strong>{risk.beta}</strong>
          </div>
          <small>Based on past 1 year behavior.</small>
        </div>

         {/* Card 2: AI Price Prediction */}
         <div className="analysis-card">
          <h3 className="analysis-title">AI Price Forecast</h3>
          <div className="analysis-row">
            <span>Next Close:</span>
            <strong className="prediction-price">
              ${prediction.next_day_price ? prediction.next_day_price.toFixed(2) : 'N/A'}
            </strong>
          </div>
          {currentClose && prediction.next_day_price && (
             <p className={`prediction-diff ${prediction.next_day_price > currentClose ? "positive" : "negative"}`}>
              {prediction.next_day_price > currentClose ? "▲" : "▼"} from ${currentClose.toFixed(2)}
             </p>
          )}
          <small>RNN Model prediction. Not financial advice.</small>
        </div>
        
        {/* Card 3: Signal Gauge */}
        <div className="analysis-card gauge-card">
          <h3 className="analysis-title" style={{marginBottom: '0.5rem', border: 'none'}}>Signal Strength</h3>
          
          {/* Using the new SVG Component */}
          <RiskGauge probability={gaugeVal} />
          
          <small style={{textAlign: 'center', marginTop: 0}}>
             Predicted move intensity
          </small>
        </div>
      </div>
    );
  };

  if (err) return <div className="error-text">Error: {err}</div>;
  if (!data) return <div className="loading-text">Loading...</div>;

  const meta = data.meta;
  const rows = data.rows.slice(-10);

  return (
    <div className="stock-container">
      <h1 className="stock-header">{symbol.toUpperCase()} Stock Data</h1>

      <div className="stock-meta">
        <p><strong>Symbol:</strong> {meta.symbol}</p>
        <p><strong>Last Refreshed:</strong> {meta.last_refreshed}</p>
        <p><strong>Time Zone:</strong> {meta.time_zone}</p>
        {meta.interval && <p><strong>Interval:</strong> {meta.interval}</p>}
      </div>

      <button className="watchlist-btn" onClick={handleWatchlistToggle}>
        {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
      </button>
      
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
                <td className={r.close >= r.open ? "positive" : "negative"}>
                  {r.close.toFixed(2)}
                </td>
                <td>{r.high.toFixed(2)} / {r.low.toFixed(2)}</td>
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