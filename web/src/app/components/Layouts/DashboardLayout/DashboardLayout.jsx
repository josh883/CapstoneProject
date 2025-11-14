"use client";
import "./DashboardLayout.css";
import Sidebar from "../../Sidebar/Sidebar";
import SearchBar from "../../SearchBar/SearchBar";
import WatchlistDash from "../../WatchlistDashboard/WatchlistDashboard";
import UserData from "../../UserData/UserData";
import Profile from "../../Profile/Profile";
import News from "../../News/News";

export default function DashboardLayout() {
  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="main-content">
        <SearchBar />
        <WatchlistDash />
        <UserData />
      </div>

      <div className="right-panel">
        <Profile />
        <News />
      </div>
    </div>
  );
}