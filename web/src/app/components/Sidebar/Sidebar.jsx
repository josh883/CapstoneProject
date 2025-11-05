"use client";
import "./Sidebar.css";
import { useRouter, usePathname } from "next/navigation";
import { Home, Eye, Briefcase, Settings, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  // Detects dark mode automatically
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true });
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  const menuItems = [
    { name: "Home", path: "/dashboard", icon: <Home size={18} /> },
    { name: "Watchlist", path: "/watchlist", icon: <Eye size={18} /> },
    { name: "Portfolio", path: "/portfolio", icon: <Briefcase size={18} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={18} /> },
  ];

  return (
    <nav className="sidebar bg-surface">
      <div className="brand-header">
        <img
          src={isDark ? "/Logo_dark.PNG" : "/Logo.PNG"}
          alt="Pennysworthe Logo"
          className="brand-logo"
        />
        <h2 className="brand-name">Pennysworthe</h2>
      </div>

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
