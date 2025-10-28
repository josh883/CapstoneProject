"use client";
import Sidebar from "../../Sidebar/Sidebar";
import "./WatchlistLayout.css";

export default function WatchlistLayout() {
  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <h1>Watchlist</h1>
      </div>
    </div>
  );
}
