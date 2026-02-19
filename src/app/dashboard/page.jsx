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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 animate-pulse">
        Loading session info...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-4xl">⏳</div>
        <h2 className="text-2xl font-bold text-slate-300">No Active Session</h2>
        <p className="text-slate-500">Waiting for admin to create a session.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-fadeIn">
      <header className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          {session.title}
        </h1>
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
          <span className={`w-2 h-2 rounded-full ${session.phase === 'closed' ? 'bg-slate-500' : 'bg-teal-400 animate-pulse'}`} />
          <span className="text-sm font-medium text-teal-100 uppercase tracking-wide">
            {PHASE_LABELS[session.phase] || session.phase}
          </span>
        </div>
      </header>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Meeting Date</h3>
            <p className="text-2xl font-bold text-white">{session.meeting_date || "Not scheduled"}</p>
          </div>

          {session.recognition_period_start && (
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Recognition Period</h3>
              <p className="text-xl font-medium text-white">
                {session.recognition_period_start} <span className="text-slate-500 mx-2">to</span> {session.recognition_period_end}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center text-slate-500 text-sm">
          Session ID: <code className="bg-black/30 px-2 py-1 rounded text-slate-400">{session.id}</code>
        </div>
      </div>
    </div>
  );
}
