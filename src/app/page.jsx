"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { checkAdminPassword } from "@/lib/api";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [expiredMessage, setExpiredMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "1") setExpiredMessage(true);
  }, [searchParams]);

  async function handleLogin(e) {
    e.preventDefault();
    const password = e.target.password?.value?.trim();
    if (!password) return;
    setLoginError("");
    setLoading(true);
    const { ok } = await checkAdminPassword(password);
    setLoading(false);
    if (!ok) {
      setLoginError("Wrong password. Please try again.");
      return;
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("adminPassword", password);
    }
    router.push("/admin");
  }

  return (
    <div className="min-h-screen text-slate-800 overflow-x-hidden" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbwkff 0%, #eff6ff 100%)" }}>
      {/* Note: Using a softer light blue gradient for the whole page */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #60a5fa 40%, #ffffff 90%)" }} />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col z-10">

        {/* Navbar */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-6">
          <a href="/" className="flex items-center gap-2 group">
            <img
              src="/hexa-logo.png"
              alt="Hexa Climate"
              className="h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
          </a>
        </nav>

        {/* Hero Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pb-24">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-4 text-blue-100">
            Hexa Climate ✦ Fortnightly Goal Meeting
          </p>

          <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight mb-4 text-white drop-shadow-md">
            <span className="text-white">Recognizing</span>
            <br />
            Best Performance
          </h1>

          <p className="text-base sm:text-lg text-blue-50 max-w-lg mx-auto mb-10 leading-relaxed font-medium">
            Based on self nomination & voting
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => document.getElementById("admin-login")?.scrollIntoView({ behavior: "smooth" })}
              className="group px-10 py-4 rounded-2xl font-semibold text-base text-blue-900 bg-white shadow-lg hover:bg-blue-50 transition-all hover:scale-105 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" /></svg>
                Admin Login
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ADMIN LOGIN
      ══════════════════════════════════════════ */}
      <section id="admin-login" className="relative z-10 px-6 sm:px-12 py-20 flex items-center justify-center bg-white/30 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-white border border-blue-100">

          {/* Top Bar */}
          <div className="px-8 py-6 flex items-center gap-4 bg-blue-50/50 border-b border-blue-100">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-white shadow-sm border border-blue-100">
              🔐
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Admin Login</h2>
              <p className="text-slate-500 text-xs mt-0.5">Manage sessions &amp; participants</p>
            </div>
          </div>

          <div className="px-8 py-8">
            {expiredMessage && <p className="mb-4 text-sm text-yellow-600">Session expired. Please log in again.</p>}
            {loginError && <p className="mb-4 text-sm text-red-600">{loginError}</p>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="• • • • •"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Logging in…" : "Log in to Admin Panel →"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">Hexa Climate</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-xs text-slate-500 border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
        © 2026 Hexa Climate · Best Performer Recognition System
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50" />}>
      <HomeContent />
    </Suspense>
  );
}
