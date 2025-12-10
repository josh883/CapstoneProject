"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart as ChartJS, ArcElement, Legend, Tooltip, DoughnutController } from "chart.js";
import { buildApiUrl } from "@/app/lib/apiClient";
import "./UserData.css";

ChartJS.register(DoughnutController, ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  "#7c3aed",
  "#22c55e",
  "#f97316",
  "#0ea5e9",
  "#e11d48",
  "#a855f7",
  "#10b981",
  "#6366f1",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function UserData({
  watchlist = [],
  watchlistMovers = [],
  watchlistLoading = false,
}) {
  const [holdings, setHoldings] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [holdingsError, setHoldingsError] = useState("");
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function fetchHoldings() {
      setHoldingsLoading(true);
      setHoldingsError("");
      try {
        const res = await fetch(buildApiUrl("/portfolio/holdings"), {
          credentials: "include",
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          throw new Error(data.detail || data.message || "Unable to load holdings.");
        }
        const normalized = (data.holdings || []).map((item) => ({
          asset: item.asset,
          shares: Number(item.shares ?? 0),
          totalCost: Number(item.totalCost ?? 0),
        }));
        setHoldings(normalized);
      } catch (err) {
        if (active) {
          setHoldings([]);
          setHoldingsError(err.message || "Unable to load holdings.");
        }
      } finally {
        if (active) {
          setHoldingsLoading(false);
        }
      }
    }

    fetchHoldings();
    return () => {
      active = false;
    };
  }, []);

  const allocation = useMemo(() => {
    const entries = holdings
      .filter((item) => item.asset && Number.isFinite(item.totalCost))
      .map((item, index) => ({
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));

    const total = entries.reduce((sum, item) => sum + item.totalCost, 0);

    return {
      total,
      entries: entries.map((item) => ({
        ...item,
        weight: total ? (item.totalCost / total) * 100 : 0,
      })),
    };
  }, [holdings]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!allocation.total || allocation.entries.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");

    chartRef.current = new ChartJS(ctx, {
      type: "doughnut",
      data: {
        labels: allocation.entries.map((item) => item.asset),
        datasets: [
          {
            data: allocation.entries.map((item) => item.totalCost),
            backgroundColor: allocation.entries.map((item) => item.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const percent =
                  allocation.total > 0
                    ? ` (${((value / allocation.total) * 100).toFixed(1)}%)`
                    : "";
                return `${context.label}: ${currencyFormatter.format(value)}${percent}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [allocation]);

  const sortedMovers = useMemo(() => {
    if (!Array.isArray(watchlistMovers)) return [];
    return [...watchlistMovers]
      .filter((item) => typeof item?.changePercent === "number")
      .sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
      )
      .slice(0, 3);
  }, [watchlistMovers]);

  return (
    <div className="userdata-section">
      <div className="userdata-grid">
        <section className="userdata-card">
          <div className="userdata-card-header">
            <div>
              <p className="eyebrow-text">Portfolio</p>
              <h3>Allocation breakdown</h3>
              <p className="subtext">Based on your tracked holdings cost basis.</p>
            </div>
            <div className="pill">
              {holdings.length} {holdings.length === 1 ? "holding" : "holdings"}
            </div>
          </div>

          {holdingsLoading ? (
            <div className="placeholder-box slim">Loading portfolio...</div>
          ) : holdingsError ? (
            <p className="error-text">{holdingsError}</p>
          ) : allocation.entries.length === 0 || allocation.total <= 0 ? (
            <div className="empty-state">
              <p>Add holdings to see your portfolio breakdown.</p>
            </div>
          ) : (
            <div className="allocation-layout">
              <div className="chart-container">
                <canvas ref={canvasRef} aria-label="Portfolio allocation" role="img" />
                <div className="chart-center">
                  <span className="chart-total">{currencyFormatter.format(allocation.total)}</span>
                  <span className="chart-caption">Total cost</span>
                </div>
              </div>

              <ul className="allocation-list">
                {allocation.entries.map((item) => (
                  <li key={item.asset} className="allocation-row">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="allocation-meta">
                      <span className="allocation-asset">{item.asset}</span>
                      <span className="allocation-shares">
                        {item.shares.toLocaleString()} shares
                      </span>
                    </div>
                    <div className="allocation-values">
                      <span className="allocation-amount">
                        {currencyFormatter.format(item.totalCost)}
                      </span>
                      <span className="allocation-percent">
                        {item.weight.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="userdata-card movers-card">
          <div className="userdata-card-header">
            <div>
              <p className="eyebrow-text">Watchlist</p>
              <h3>Biggest movers today</h3>
              <p className="subtext">
                Daily change for symbols in your watchlist.
              </p>
            </div>
            <div className="pill secondary">
              {watchlist.length} saved
            </div>
          </div>

          {watchlistLoading ? (
            <div className="placeholder-box slim">Loading watchlist...</div>
          ) : !watchlist.length ? (
            <div className="empty-state">
              <p>Add tickers to your watchlist to see daily moves.</p>
            </div>
          ) : sortedMovers.length === 0 ? (
            <div className="empty-state">
              <p>Price change data is unavailable right now.</p>
            </div>
          ) : (
            <div className="movers-list">
              {sortedMovers.map((item) => {
                const change = item.changePercent;
                const isUp = change > 0;
                const isFlat = change === 0;
                return (
                  <div key={item.ticker} className="mover-row">
                    <div className="mover-meta">
                      <span className="mover-ticker">{item.ticker}</span>
                      {item.latestClose !== undefined && (
                        <span className="mover-price">
                          {currencyFormatter.format(item.latestClose)}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mover-change ${
                        isFlat ? "neutral" : isUp ? "positive" : "negative"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
