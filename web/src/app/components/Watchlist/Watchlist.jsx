"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "../../lib/apiClient";
import "./Watchlist.css";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const trendingStocks = ["NVDA", "TSLA", "AAPL", "META", "AMZN", "GOOG"];
  const otherStocks = ["SHOP", "UBER", "NFLX", "MSFT", "DIS", "AMD"];

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

  const renderSection = (title, stocks, emptyText) => (
    <div className="watchlist-section-card">
      <h2 className="section-title">{title}</h2>
      <div className="stock-row">
        {stocks.length === 0 ? (
          <p className="empty-text">{emptyText}</p>
        ) : (
          stocks.map((ticker) => (
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

  return (
    <div className="watchlist-page">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {renderSection("Your Watchlist", watchlist, "No stocks in your watchlist yet.")}
          {renderSection("Hot Right Now", trendingStocks, "No trending data.")}
          {renderSection("Suggested Stocks", otherStocks, "No suggestions yet.")}
        </>
      )}
    </div>
  );
}
