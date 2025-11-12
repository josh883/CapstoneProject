"use client";
import "./WatchlistLayout.css";
import Sidebar from "../../Sidebar/Sidebar";
import SearchBar from "../../SearchBar/SearchBar";
import Profile from "../../Profile/Profile";
import News from "../../News/News";
import Watchlist from "../../Watchlist/Watchlist";

export default function WatchlistLayout() {
  return (
    <div className="watchlist-dashboard-container">
      <Sidebar />

      <div className="main-content">
        <SearchBar />
        <Watchlist />
      </div>

      <div className="right-panel">
        <Profile />
        <News />
        
      </div>
    </div>
  );
}
