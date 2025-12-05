"use client";
import "./StockLayout.css";
import Sidebar from "../../Sidebar/Sidebar";
import SearchBar from "../../SearchBar/SearchBar";
import StockInfo from "../../StockInfo/StockInfo";
import Profile from "../../Profile/Profile";
import News from "../../News/News";

export default function StockLayout() {
  return (
    <div className="stock-dashboard-container">
      <Sidebar />

      <div className="stock-main-content">
        <SearchBar />
        <StockInfo />
      </div>

      <div className="stock-right-panel">
        <Profile />
        <News symbolFromPage />
      </div>
    </div>
  );
}