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
    <div className="min-h-screen bg-[#050d1a] text-white overflow-x-hidden">

      {/* ══════════════════════════════════════════
          HERO — full-viewport Three.js section
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #ffffff 100%)" }}>

        {/* Deep radial vignette for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.2) 100%)",
            zIndex: 1,
          }}
        />

        {/* ── Navbar ── */}
        <nav
          className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-6"
          style={{ zIndex: 10 }}
        >
          <a href="/" className="flex items-center gap-2 group">
            {/* Real Hexa Climate logo — white version for dark bg */}
            <img
              src="/hexa-logo-white.svg"
              alt="Hexa Climate"
              className="h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
          </a>
        </nav>

        {/* ── Hero copy (vertically centred in remaining space) ── */}
        <div
          className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pb-24"
          style={{ zIndex: 10 }}
        >
          {/* Tiny label */}
          <p
            className="text-xs font-semibold tracking-[0.25em] uppercase mb-4 text-blue-200"
          >
            Hexa Climate ✦ Fortnightly Goal Meeting
          </p>

          {/* Main headline */}
          <h1
            className="text-5xl sm:text-7xl font-extrabold leading-tight mb-4 text-white drop-shadow-md"
          >
            <span className="text-white">Recognizing</span>
            <br />
            Best Performance
          </h1>

          {/* Subline */}
          <p
            className="text-base sm:text-lg text-blue-100 max-w-lg mx-auto mb-10 leading-relaxed font-medium"
          >
            Based on self nomination & voting
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              onClick={() =>
                document.getElementById("admin-login")?.scrollIntoView({ behavior: "smooth" })
              }
              className="relative group px-10 py-4 rounded-2xl font-semibold text-base text-white overflow-hidden transition-transform hover:scale-105 active:scale-[0.98] shadow-[0_0_40px_rgba(20,184,166,0.45)]"
              style={{ background: "linear-gradient(135deg, #0F766E, #14B8A6)" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" /></svg>
                Admin Login
              </span>
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(135deg, #14B8A6, #0d9488)" }}
              />
            </button>
          </div>

          {/* Scroll hint */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          >
            <span className="text-xs text-slate-500 tracking-widest uppercase">Scroll</span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M1 1l7 7 7-7" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ADMIN LOGIN
      ══════════════════════════════════════════ */}
      <section
        id="admin-login"
        className="px-6 sm:px-12 py-20 flex items-center justify-center"
      >
        <div
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md border border-white/20"
        >
          {/* Top gradient bar */}
          <div
            className="px-8 py-6 flex items-center gap-4 bg-white/10"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-blue-100/20 border border-blue-200/30"
            >
              🔐
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Login</h2>
              <p className="text-blue-100 text-xs mt-0.5">Manage sessions &amp; participants</p>
            </div>
          </div>

          <div className="px-8 py-8">
            {expiredMessage && (
              <p className="mb-4 text-sm text-yellow-300" role="alert">
                Session expired or wrong password. Please log in again.
              </p>
            )}
            {loginError && (
              <p className="mb-4 text-sm text-red-300" role="alert">
                {loginError}
              </p>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-50 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 bg-white/90 border border-white/50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-blue-900 text-sm transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-60 bg-white hover:bg-blue-50"
              >
                {loading ? "Logging in…" : "Log in to Admin Panel →"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-blue-200/20" />
              <span className="text-xs text-blue-100">Hexa Climate</span>
              <div className="flex-1 h-px bg-blue-200/20" />
            </div>

            <p className="text-center text-xs text-blue-100/70">
              Session Management Console
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-center py-8 text-xs text-blue-900/60 border-t border-blue-900/10"
      >
        © 2026 Hexa Climate · Best Performer Recognition System
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050d1a]" />}>
      <HomeContent />
    </Suspense>
  );
}
