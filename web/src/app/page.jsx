"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[var(--color-surface)] shadow">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Pennysworthe
        </h1>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition"
        >
          Login
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl font-semibold text-[var(--color-text-primary)] mb-4">
          Welcome to Pennysworthe
        </h2>
        <p className="text-[var(--color-text-secondary)] max-w-xl mb-8">
          A simple tool to explore and analyze stock data efficiently. Search, visualize, and compare performance metrics all in one place.
        </p>
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-[var(--color-primary)] text-white text-lg rounded-lg hover:bg-[var(--color-primary-hover)] transition"
        >
          Get Started
        </button>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 text-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] shadow">
        © {new Date().getFullYear()} Pennysworthe. All rights reserved.
      </footer>
    </div>
  );
}


