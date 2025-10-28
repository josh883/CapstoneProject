"use client";
import Sidebar from "../../Sidebar/Sidebar";
import "./PortfolioLayout.css";

export default function PortfolioLayout() {
  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <h1>Portfolio</h1>
      </div>
    </div>
  );
}
