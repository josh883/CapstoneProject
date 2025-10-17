"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (symbol.trim()) router.push(`/stock/${symbol.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <form onSubmit={handleSearch} className="flex items-center justify-center w-full max-w-md">
        <input
          type="text"
          placeholder="Enter stock symbol (e.g. AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          required
          className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-3 rounded-r-lg hover:bg-indigo-700"
        >
          Search
        </button>
      </form>
    </div>
  );
}
