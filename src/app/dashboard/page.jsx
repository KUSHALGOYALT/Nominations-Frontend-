"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/api";

const PHASE_LABELS = {
  setup: "Setting Up",
  nomination: "Nominations Open",
  voting: "Voting in Progress",
  results: "Results Announced",
  closed: "Session Closed",
};

export default function DashboardPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((data) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 animate-pulse bg-white">
        Loading session info...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-white">
        <div className="text-4xl">⏳</div>
        <h2 className="text-2xl font-bold text-slate-800">No Active Session</h2>
        <p className="text-slate-500">Waiting for admin to create a session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 bg-white">
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }} />
      {/* Navbar / Header Area */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-blue-100/50 sticky top-0 z-10">
        <a href="/" className="flex items-center gap-2">
          <img src="/hexa-logo.png" alt="Hexa" className="h-8 w-auto" />
        </a>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 animate-fadeIn">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            {session.title}
          </h1>
          <div className="inline-flex items-center gap-3 bg-white border border-blue-100 px-4 py-2 rounded-full shadow-sm">
            <span className={`w-2 h-2 rounded-full ${session.phase === 'closed' ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`} />
            <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">
              {PHASE_LABELS[session.phase] || session.phase}
            </span>
          </div>
        </header>

        <div className="bg-white border border-blue-100 rounded-3xl p-8 shadow-xl shadow-blue-900/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Meeting Date</h3>
              <p className="text-2xl font-bold text-slate-800">{session.meeting_date || "Not scheduled"}</p>
            </div>

            {session.recognition_period_start && (
              <div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Recognition Period</h3>
                <p className="text-xl font-medium text-slate-700">
                  {session.recognition_period_start} <span className="text-slate-400 mx-2">to</span> {session.recognition_period_end}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
            Session ID: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">{session.id}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
