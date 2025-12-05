"use client";
import Sidebar from "../../Sidebar/Sidebar";
import "./SettingsLayout.css";
import Settings from "../../Settings/Settings"; 

export default function SettingsLayout() {
  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Settings />
      </div>
    </div>
  );
}