"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl } from "../../lib/apiClient";
import Chart from "chart.js/auto";
import "@/app/globals.css";
import "./StockInfo.css";

export default function StockInfo() {
  const { symbol } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [message, setMessage] = useState("");
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

  // Fetch price data
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

  // Check if this stock is in user's watchlist
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
        setMessage(json.message);
      } else {
        setMessage(json.detail || "Error updating watchlist");
      }
    } catch (e) {
      setMessage("Network error");
    }
  };

  // Chart rendering
  useEffect(() => {
    if (!data?.rows) return;
    const renderChart = () => {
      const ctx = document.getElementById("priceChart");
      if (!ctx) return;

      if (window.stockChart) window.stockChart.destroy();

      const labels = data.rows.slice(-10).map((r) => r.timestamp.split("T")[0]);
      const closePrices = data.rows.slice(-10).map((r) => r.close);

      const isDarkMode = document.documentElement.classList.contains("dark");
      const styles = getComputedStyle(document.documentElement);
      const primaryColor = isDarkMode
        ? "#a78bfa"
        : styles.getPropertyValue("--color-primary").trim() || "#4f46e5";
      const surfaceColor = isDarkMode
        ? "rgba(167,139,250,0.15)"
        : "rgba(79,70,229,0.1)";
      const textColor = isDarkMode ? "#e5e7eb" : "#111827";
      const gridColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

      window.stockChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: `${symbol} Closing Prices`,
              data: closePrices,
              borderColor: primaryColor,
              backgroundColor: surfaceColor,
              tension: 0.3,
              fill: true,
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
  }, [data, symbol]);

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
      {/* {message && <p className="watchlist-message">{message}</p>} */}

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
