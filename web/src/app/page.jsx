"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-white shadow">
        <h1 className="text-2xl font-bold text-gray-800">Pennysworthe</h1>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Login
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl font-semibold text-gray-800 mb-4">
          Welcome to Pennysworthe
        </h2>
        <p className="text-gray-600 max-w-xl mb-8">
          A simple tool to explore and analyze stock data efficiently. Search, visualize, and compare performance metrics all in one place.
        </p>
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-indigo-600 text-white text-lg rounded-lg hover:bg-indigo-700 transition"
        >
          Get Started
        </button>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} Pennysworthe. All rights reserved.
      </footer>
    </div>
  );
}
