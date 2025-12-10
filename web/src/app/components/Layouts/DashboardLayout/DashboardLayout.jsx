"use client";
import "./DashboardLayout.css";
import { useEffect, useState } from "react";
import Sidebar from "../../Sidebar/Sidebar";
import SearchBar from "../../SearchBar/SearchBar";
import WatchlistDash from "../../WatchlistDashboard/WatchlistDashboard";
import UserData from "../../UserData/UserData";
import Profile from "../../Profile/Profile";
import News from "../../News/News";
import { buildApiUrl } from "@/app/lib/apiClient";

export default function DashboardLayout() {
  const [watchlistState, setWatchlistState] = useState({
    watchlist: [],
    movers: [],
  });
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchWatchlist() {
      setWatchlistLoading(true);
      try {
        const res = await fetch(
          buildApiUrl("/watchlist?include_changes=true"),
          { credentials: "include" }
        );
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setWatchlistState({
            watchlist: data.watchlist || [],
            movers: data.movers || [],
          });
        } else {
          setWatchlistState({ watchlist: [], movers: [] });
        }
      } catch {
        if (isMounted) {
          setWatchlistState({ watchlist: [], movers: [] });
        }
      } finally {
        if (isMounted) {
          setWatchlistLoading(false);
        }
      }
    }

    fetchWatchlist();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="main-content">
        <SearchBar />
        <WatchlistDash
          watchlist={watchlistState.watchlist}
          loading={watchlistLoading}
        />
        <UserData
          watchlist={watchlistState.watchlist}
          watchlistMovers={watchlistState.movers}
          watchlistLoading={watchlistLoading}
        />
      </div>

      <div className="right-panel">
        <Profile />
        <News />
      </div>
    </div>
  );
}
