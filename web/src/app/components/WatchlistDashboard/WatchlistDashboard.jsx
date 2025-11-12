"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "../../lib/apiClient";
import "./WatchlistDashboard.css";

export default function WatchlistDash() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchWatchlist() {
      try {
        const res = await fetch(buildApiUrl(`/watchlist`), { credentials: "include" });
        const data = await res.json();
        if (res.ok) setWatchlist(data.watchlist || []);
      } catch {
        setWatchlist([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWatchlist();
  }, []);

  const handleClick = (ticker) => {
    router.push(`/stock/${ticker}`);
  };

  if (loading) {
    return (
      <div className="watchlistdash-section placeholder-box">
        Loading your watchlist...
      </div>
    );
  }

  return (
    <div className="watchlistdash-section">
      <div className="section-header">
        <h2>Your Watchlist</h2>
      </div>

      <div className="stock-row">
        {watchlist.length === 0 ? (
          <p className="empty-text">No stocks in your watchlist yet.</p>
        ) : (
          watchlist.map((ticker) => (
            <div key={ticker} className="stock-card" onClick={() => handleClick(ticker)}>
              <img
                src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
                alt={`${ticker} logo`}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/80?text=Stock";
                }}
              />
              <p>{ticker}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
