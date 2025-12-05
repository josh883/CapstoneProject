"use client";
import Sidebar from "../../Sidebar/Sidebar";
import PortfolioPage from "../../PortfolioPage/PortfolioPage";
import "./PortfolioLayout.css";

export default function PortfolioLayout() {
  return (
    <div className="portfolio-page-layout">
      <Sidebar />
      <div className="portfolio-page-content">
        <PortfolioPage />
      </div>
    </div>
  );
}
