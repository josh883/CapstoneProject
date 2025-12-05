"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "../../lib/apiClient";
import "./Watchlist.css";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [actives, setActives] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const wlRes = await fetch(buildApiUrl(`/watchlist`), { credentials: "include" });
        const wlData = await wlRes.json();
        if (wlRes.ok) setWatchlist(wlData.watchlist || []);

        const recRes = await fetch(buildApiUrl(`/recommendations`), { credentials: "include" });
        const recData = await recRes.json();
        if (recRes.ok) {
          setGainers(recData.gainers || []);
          setActives(recData.actives || []);
        }
      } catch {
        setWatchlist([]);
        setGainers([]);
        setActives([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleClick = (ticker) => {
    router.push(`/stock/${ticker}`);
  };

  const renderSection = (title, stocks, emptyText, caption) => (
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
                  e.target.onerror = null;
                  e.target.src = `https://via.placeholder.com/80/1f2937/ffffff?text=${ticker}`;
                }}
              />
              <p>{ticker}</p>
            </div>
          ))
        )}
      </div>
      <p className="caption-text">{caption}</p>
    </div>
  );

  return (
    <div className="watchlist-page">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {renderSection("Your Watchlist", watchlist, "No stocks in your watchlist yet.", "Your saved stocks.")}

          {renderSection(
            "Top Gainers",
            gainers,
            "No gainer data.",
            "Top daily percentage gainers from US markets."
          )}

          {renderSection(
            "Most Active",
            actives,
            "No active data.",
            "Most actively traded tickers by daily volume."
          )}
        </>
      )}
    </div>
  );
}
