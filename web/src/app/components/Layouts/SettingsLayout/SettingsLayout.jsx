"use client";
import Sidebar from "../../Sidebar/Sidebar";
import "./SettingsLayout.css";

export default function SettingsLayout() {
  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <h1>Settings</h1>
      </div>
    </div>
  );
}
