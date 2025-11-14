// web/src/app/components/Layouts/StockLayout/StockLayout.jsx

"use client";
import "./StockLayout.css";
// --- MISSING IMPORTS RESTORED ---
import Sidebar from "../../Sidebar/Sidebar";
import SearchBar from "../../SearchBar/SearchBar";
import StockInfo from "../../StockInfo/StockInfo";
import Profile from "../../Profile/Profile";
import News from "../../News/News";
// --- NEW GAUGE IMPORT ---
import RiskGaugeDisplay from "../../RiskGaugeDisplay/RiskGaugeDisplay"; 

export default function StockLayout() {
  return (
    <div className="stock-dashboard-container">
      <Sidebar />

      <div className="stock-main-content">
        <SearchBar />
        
        {/* Risk Gauge Added */}
        <div style={{ padding: '10px 0', marginBottom: '10px' }}>
            <RiskGaugeDisplay /> 
        </div>
        
        <StockInfo />
      </div>

      <div className="stock-right-panel">
        <Profile />
        <News />
      </div>
    </div>
  );
}