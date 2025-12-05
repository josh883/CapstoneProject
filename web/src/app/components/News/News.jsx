"use client";
import { useEffect, useState } from "react";
import { buildApiUrl } from "../../lib/apiClient";
import "./News.css";
import "@/app/globals.css";

export default function News({ symbolFromPage = false }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // If symbolFromPage true, try to parse symbol from path /stock/<SYMBOL>
  function detectSymbolFromPath() {
    if (typeof window === "undefined") return null;
    const parts = window.location.pathname.split("/").filter(Boolean);
    // path like: ["stock", "AAPL"]
    if (parts.length >= 2 && parts[0].toLowerCase() === "stock") {
      return parts[1].toUpperCase();
    }
    return null;
  }

  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      try {
        let url = "/news?limit=10";
        if (symbolFromPage) {
          const sym = detectSymbolFromPath();
          if (sym) {
            // For ticker-specific, we still request 10, knowing we might get fewer.
            url = `/news?ticker=${encodeURIComponent(sym)}&limit=10`; 
          }
        }
        // General news uses the default limit=10, but the Python backend is now 
        // fetching up to 50 articles using pagination.
        const res = await fetch(buildApiUrl(url));
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (e) {
        console.error("Failed to fetch news", e);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
    const onPop = () => {
      if (symbolFromPage) fetchNews();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [symbolFromPage]);

  if (loading) {
    return <div className="news-section placeholder-box">Loading...</div>;
  }

  if (!articles.length) {
    return <div className="news-section placeholder-box">No recent market news</div>;
  }

  return (
    <div className="news-section">
      <h2 className="news-header">Market News</h2>
      <div className="news-grid">
        {articles.map((a, i) => {
          let dateText = "Unknown date";
          if (a.time_published) {
            const d = new Date(a.time_published);
            if (!isNaN(d)) {
              dateText = d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            }
          }

          const shortTitle = a.title?.length > 80 ? a.title.slice(0, 77) + "..." : a.title;
          const summary = a.summary?.length > 150 ? a.summary.slice(0, 147) + "..." : a.summary;

          // sentiment badge text. This will now be an empty string if Python passed 'null'.
          const sentimentLabel = a.sentiment || ""; 
          
          // sentimentClass will be 'sentiment-neutral' if sentimentLabel is 'Neutral' or empty
          const sentimentClass =
            sentimentLabel === "Bullish"
              ? "sentiment-bullish"
              : sentimentLabel === "Bearish"
              ? "sentiment-bearish"
              : "sentiment-neutral";

          return (
            <div
              key={i}
              className="news-card compact"
              onClick={() => window.open(a.url, "_blank", "noopener,noreferrer")}
            >
              <h3 className="news-title">{shortTitle}</h3>
              <p className="news-source">
                {a.source || "Unknown source"} • {dateText}
              </p>
              <p className="news-summary">{summary || "No summary available"}</p>

              {/* Small sentiment badge */}
              {/* TEST CHANGE: sentimentLabel will be "" if sentiment was missing. 
                 This check ensures the badge is only displayed if sentiment is explicitly present. */}
              {sentimentLabel && (
                <div className={`news-sentiment ${sentimentClass}`}>{sentimentLabel}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}