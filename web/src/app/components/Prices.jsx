"use client";
import { useEffect, useState } from "react";

/**
 * Props:
 *  - fn: "TIME_SERIES_DAILY" | "TIME_SERIES_INTRADAY" | "TIME_SERIES_WEEKLY" | "TIME_SERIES_MONTHLY"
 *  - symbol: e.g. "IBM"
 *  - interval: e.g. "5min" (required for INTRADAY)
 *  - show: how many most recent rows to display
 */

export default function Prices({
  fn = "TIME_SERIES_DAILY",
  symbol = "IBM",
  interval = undefined,
  show = 5,
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ function: fn, symbol });
    if (fn === "TIME_SERIES_INTRADAY" && interval) params.set("interval", interval);

    setLoading(true);
    fetch(`/api/prices?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j))))
      .then((json) => {
        setData(json);
        setErr(null);
      })
      .catch((e) => setErr(e?.error || e?.detail || "Failed to load"))
      .finally(() => setLoading(false));
  }, [fn, symbol, interval]);

  if (loading) return <div>Loading…</div>;
  if (err) return <div style={{ color: "crimson" }}>Error: {String(err)}</div>;
  if (!data) return null;

  const rows = data.rows ?? [];
  const last = rows.slice(-show);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h3 style={{ margin: "0 0 8px" }}>
        {symbol} — {fn} {interval ? `(${interval})` : ""}
      </h3>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        Last refreshed: {data.meta?.last_refreshed} ({data.meta?.time_zone})
      </div>

      <div style={{ overflowX: "auto" }}>
        <table cellPadding={6} style={{ borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr>
              {["timestamp", "open", "high", "low", "close", "volume"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {last.map((r) => (
              <tr key={r.timestamp}>
                <td>{r.timestamp}</td>
                <td>{r.open}</td>
                <td>{r.high}</td>
                <td>{r.low}</td>
                <td>{r.close}</td>
                <td>{r.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
