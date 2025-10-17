"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Chart from "chart.js/auto";

export default function StockPage() {
  const { symbol } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) router.push(`/stock/${search.toUpperCase()}`);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:8000/prices?function=TIME_SERIES_DAILY&symbol=${symbol}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || "Fetch error");
        setData(json);
      } catch (e) {
        setErr(e.message);
      }
    }
    fetchData();
  }, [symbol]);

  useEffect(() => {
    if (!data?.rows) return;

    const ctx = document.getElementById("priceChart");
    if (!ctx) return;

    if (window.stockChart) window.stockChart.destroy();

    const labels = data.rows.slice(-10).map(r => r.timestamp.split("T")[0]);
    const closePrices = data.rows.slice(-10).map(r => r.close);

    window.stockChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${symbol} Closing Prices`,
            data: closePrices,
            borderColor: "rgb(79, 70, 229)",
            backgroundColor: "rgba(79, 70, 229, 0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
    });
  }, [data, symbol]);

  if (err) return <div className="text-red-600 p-8 text-lg">Error: {err}</div>;
  if (!data) return <div className="p-8 text-lg">Loading...</div>;

  const meta = data.meta;
  const rows = data.rows.slice(-10);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center justify-center w-full max-w-md mt-6 mb-4">
        <input
          type="text"
          placeholder="Enter stock symbol (e.g. AAPL)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-3 rounded-r-lg hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mt-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          {symbol.toUpperCase()} Stock Data
        </h1>

        {/* Meta Summary */}
        <div className="p-3 mb-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <p><strong>Symbol:</strong> {meta.symbol}</p>
          <p><strong>Last Refreshed:</strong> {meta.last_refreshed}</p>
          <p><strong>Time Zone:</strong> {meta.time_zone}</p>
          {meta.interval && <p><strong>Interval:</strong> {meta.interval}</p>}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Open</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Close</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">High / Low</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(r => (
                <tr key={r.timestamp}>
                  <td className="px-6 py-4 text-sm text-gray-900">{r.timestamp.split("T")[0]}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.open.toFixed(2)}</td>
                  <td className={`px-6 py-4 text-sm ${r.close >= r.open ? "text-green-600" : "text-red-600"}`}>
                    {r.close.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.high.toFixed(2)} / {r.low.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="mt-10 bg-white p-4 rounded-xl shadow-lg">
          <canvas id="priceChart" width="700" height="400"></canvas>
        </div>
      </div>
    </div>
  );
}
