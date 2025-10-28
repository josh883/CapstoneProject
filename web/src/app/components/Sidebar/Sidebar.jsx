"use client";
import "./Sidebar.css";
import { useRouter, usePathname } from "next/navigation";
import { Home, Eye, Briefcase, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: "Home", path: "/dashboard", icon: <Home size={18} /> },
    { name: "Watchlist", path: "/watchlist", icon: <Eye size={18} /> },
    { name: "Portfolio", path: "/portfolio", icon: <Briefcase size={18} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={18} /> },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-title">Pennysworthe</div>
      <ul className="menu">
        {menuItems.map((item) => (
          <li
            key={item.name}
            className={`menu-item ${pathname === item.path ? "active" : ""}`}
            onClick={() => router.push(item.path)}
          >
            {item.icon}
            <span>{item.name}</span>
          </li>
        ))}
      </ul>

      <button className="logout-btn" onClick={() => router.push("/login")}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </nav>
  );
}
