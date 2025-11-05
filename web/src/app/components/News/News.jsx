import { useEffect, useState } from "react";
import "./News.css";
import "@/app/globals.css";

export default function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("http://localhost:8000/api/news");
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (e) {
        console.error("Failed to fetch news", e);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
