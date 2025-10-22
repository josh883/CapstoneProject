"use client";
import "./SearchBar.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [symbol, setSymbol] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (symbol.trim()) router.push(`/stock/${symbol.toUpperCase()}`);
  };

  return (
    <div className="search-section">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Enter stock symbol (e.g. AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          required
          className="search-input"
        />
        <button type="submit" className="search-btn">Search</button>
      </form>
    </div>
  );
}
