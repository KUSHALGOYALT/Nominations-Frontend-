"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import {
  getSession,
  createSession,
  patchSession,
} from "@/lib/api";

/* ── Constants ─────────────────────────────────────────────── */
function getAdminPassword() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("adminPassword") || "";
}

const PHASES = ["setup", "nomination", "voting", "results", "closed"];
const PHASE_LABELS = { setup: "Setup", nomination: "Nomination", voting: "Voting", results: "Results", closed: "Closed" };
const PHASE_COLORS = {
  setup: { dot: "bg-slate-400" },
  nomination: { dot: "bg-hexa-secondary" }, // Blue
  voting: { dot: "bg-indigo-500" },
  results: { dot: "bg-amber-400" },
  closed: { dot: "bg-slate-500" },
};

function getNextPhaseInfo(phase) {
  const next = { setup: "nomination", nomination: "voting", voting: "results", results: "closed" }[phase];
  if (!next) return null;
  const labels = { nomination: "Open Nominations", voting: "Open Voting", results: "Reveal Results", closed: "Close Session" };
  const icons = { nomination: "✉️", voting: "🗳️", results: "🏆", closed: "🔒" };
  return { next, label: labels[next], icon: icons[next] };
}

/* ═══════════════════════════════════════════════════════════ */
/* ── UI Components ─────────────────────────────────────────── */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

/* ═══════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [session, setSession] = useState(null);
  const [nominations, setNominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newTitle, setNewTitle] = useState("Fortnightly Goal Review");
  const [newDate, setNewDate] = useState("");
  const [advanceLoading, setAdvanceLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!window.sessionStorage.getItem("adminPassword")) router.replace("/");
  }, [mounted, router]);

  const isAuthenticated = typeof window !== "undefined" && !!window.sessionStorage.getItem("adminPassword");

  const loadSession = useCallback(async () => {
    const data = await getSession();
    // If session is closed, treat as null so we show the "Create New Session" form
    if (data.session && data.session.phase === "closed") {
      setSession(null);
    } else {
      setSession(data.session ?? null);
    }

    // Load nominations for management/analytics
    if (data.session) {
      // We can reuse the public nominations endpoint or create a specific admin one
      // For now using the existing one which returns all nominations
      try {
        const res = await fetch(`${typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "https://nominations-backend.onrender.com/api") : ""}/nominations`).then(r => r.json());
        if (res && res.nominations) {
          setNominations(res.nominations);
        }
      } catch (e) {
        console.error("Failed to load nominations", e);
      }
    }

    return data.session;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSession().then(() => setLoading(false));
    }
  }, [loadSession, isAuthenticated]);

  function showSuccess(msg) { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }

  function handleUnauthorized() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem("adminPassword");
    window.location.href = "/?expired=1";
  }

  function handleLogout() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem("adminPassword");
    window.location.href = "/";
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setError("");
    const res = await createSession({ title: newTitle, meeting_date: newDate || undefined }, getAdminPassword());
    if (res.error) {
      if (res.error === "Unauthorized") { handleUnauthorized(); return; }
      setError(res.error);
      return;
    }
    setSession(res.session);
    setNewTitle("Fortnightly Goal Review");
    setNewDate("");
    showSuccess("Session created!");
  }

  async function handleAdvancePhase() {
    if (!session?.id) return;
    const idx = PHASES.indexOf(session.phase);
    const next = PHASES[idx + 1];
    if (!next) return;
    setError("");
    setAdvanceLoading(true);
    const res = await patchSession({ session_id: session.id, phase: next }, getAdminPassword());
    setAdvanceLoading(false);
    if (res.error) {
      if (res.error === "Unauthorized") {
        handleUnauthorized();
      } else {
        setError(res.error);
        // If we get a transition error, our state might be stale. Reload.
        if (res.error.includes("Cannot transition")) {
          loadSession();
        }
      }
      return;
    }
    setSession(res.session);
    showSuccess(`Phase advanced to ${PHASE_LABELS[next]}!`);
    loadSession();
  }

  // Delete Nomination
  async function handleDeleteNomination(id) {
    if (!confirm("Are you sure you want to delete this nomination?")) return;

    // Dynamic import to avoid circular dependency issues if any, or just use fetch directly
    // Using the helper we defined in api.js
    const { deleteNomination } = await import("@/lib/api");
    const res = await deleteNomination(id, getAdminPassword());

    if (res.error) {
      setError(res.error);
    } else {
      showSuccess("Nomination deleted.");
      // Optimistic update
      setNominations(prev => prev.filter(n => n.id !== id));
    }
  }


  /* ── Not logged in ───────── */
  if (mounted && !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center p-4 bg-blue-50"><p className="text-slate-500">Redirecting...</p></div>;
  }

  /* ── Loading ─────────────── */
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center p-4 bg-blue-50"><p className="text-slate-500">Loading...</p></div>;
  }

  /* ── Main panel ──────────── */
  const phaseInfo = PHASE_COLORS[session?.phase || "setup"];
  const nextPhase = session ? getNextPhaseInfo(session.phase) : null;
  const phaseIdx = PHASES.indexOf(session?.phase || "setup");

  // One QR/link per meeting: backend redirects to /vote?session_id=<id>
  const apiUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "https://nominations-backend.onrender.com/api")
    : "";
  const sessionUrl = session?.id ? `${apiUrl}/qr-join?session_id=${session.id}` : `${apiUrl}/qr-join`;

  // Analytics Data Preparation
  // We want to show nominations count per nominee
  const chartData = nominations.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.nominee_name);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: curr.nominee_name, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.count - a.count).slice(0, 10); // Top 10


  return (
    <div className="min-h-screen text-slate-800" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10 py-4 backdrop-blur-xl bg-white/80 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <img src="/hexa-logo.png"
            alt="Hexa Climate" className="h-10 w-auto" /> {/* Increased Logo Size */}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:inline-block bg-hexa-light text-hexa-primary border border-blue-100">
            Admin Panel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Recognition Admin</h1>
          <p className="text-slate-500 mt-1">Manage sessions & view analytics</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl text-sm bg-red-50 border border-red-200 text-red-600 animate-fadeIn">
            <span className="flex-shrink-0">⚠️</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 p-4 rounded-2xl text-sm bg-green-50 border border-green-200 text-green-700 animate-fadeIn">
            <span className="flex-shrink-0">✅</span><span>{success}</span>
          </div>
        )}

        {!session ? (
          <div className="max-w-2xl mx-auto">
            <Card icon="📅" title="Create New Session" subtitle="Start a new recognition round">
              <form onSubmit={handleCreateSession} className="space-y-4">
                <Field label="Session Title">
                  <LightInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Fortnightly Goal Review" />
                </Field>
                <Field label="Meeting Date">
                  <LightInput type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </Field>
                <GradientBtn type="submit">Create Session</GradientBtn>
              </form>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Control Center */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex-1 min-w-[300px]">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h2 className="font-bold text-slate-900 text-xl truncate">{session.title}</h2>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-100 text-blue-600">
                      <span className={`w-2 h-2 rounded-full ${phaseInfo.dot}`}
                        style={session.phase !== "closed" ? { animation: "pulseGlow 2s ease-in-out infinite" } : {}} />
                      {PHASE_LABELS[session.phase]}
                    </span>
                  </div>
                  {session.meeting_date && <p className="text-slate-500 text-sm mb-4">Meeting Date: {session.meeting_date}</p>}

                  {/* Phase stepper */}
                  <div className="flex items-center mt-6 overflow-x-auto pb-2 scrollbar-hide">
                    {PHASES.filter(p => p !== "closed").map((p, i) => {
                      const idx = PHASES.indexOf(p);
                      const done = idx < phaseIdx;
                      const active = p === session.phase;
                      return (
                        <div key={p} className="flex items-center min-w-max">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10"
                              style={{
                                background: done ? "#1E40AF" : active ? "#EFF6FF" : "#F8FAFC",
                                border: done ? "2px solid #1E40AF" : active ? "2px solid #3B82F6" : "2px solid #E2E8F0",
                                color: done ? "#fff" : active ? "#1D4ED8" : "#94A3B8",
                                boxShadow: active ? "0 0 0 4px rgba(59, 130, 246, 0.15)" : "none"
                              }}>
                              {done ? "✓" : i + 1}
                            </div>
                            <span className={`text-[11px] mt-2 font-semibold whitespace-nowrap px-2 py-0.5 rounded-full transition-colors ${active ? "bg-blue-50 text-hexa-primary" : done ? "text-hexa-secondary" : "text-slate-400"}`}>
                              {PHASE_LABELS[p]}
                            </span>
                          </div>
                          {i < 3 && (
                            <div className="h-0.5 w-12 sm:w-20 mx-2 -mt-6 flex-shrink-0 transition-all duration-500"
                              style={{ background: done ? "#1E40AF" : "#E2E8F0" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {nextPhase && session.phase !== "closed" && (
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={handleAdvancePhase} disabled={advanceLoading}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg hover:shadow-blue-500/25 flex-shrink-0 bg-hexa-primary hover:bg-hexa-secondary active:scale-95">
                      {advanceLoading
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <span className="text-lg">{nextPhase.icon}</span>}
                      {nextPhase.label}
                    </button>
                    <p className="text-xs text-slate-400 font-medium">Next Step</p>
                  </div>
                )}

                {session.phase === "closed" && (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => setSession(null)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:opacity-95 transition-all shadow-lg hover:shadow-blue-500/25 flex-shrink-0 bg-slate-700 hover:bg-slate-800 active:scale-95"
                    >
                      <span className="text-lg">➕</span>
                      Start New Session
                    </button>
                    <p className="text-xs text-slate-400 font-medium">Archive & New</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Dynamic Grid: Full width if closed (no sidebar), else 2/3 + 1/3 */}
            <div className={`grid grid-cols-1 gap-8 ${session.phase !== 'closed' ? 'lg:grid-cols-3' : ''}`}>

              {/* Main Content Column */}
              <div className={`space-y-6 ${session.phase !== 'closed' ? 'lg:col-span-2' : ''}`}>

                {/* Winner Spotlight - Only in Results/Closed */}
                {(session.phase === "results" || session.phase === "closed") && chartData.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 shadow-sm text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center text-5xl shadow-xl mb-4 text-white ring-8 ring-white/50">
                        👑
                      </div>
                      <h3 className="text-3xl font-extrabold text-slate-800 mb-1">{chartData[0].name}</h3>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider mb-4">
                        🏆 Winner
                      </span>
                      <p className="text-slate-600 font-medium">Secured {chartData[0].count} votes</p>
                    </div>
                  </div>
                )}

                <Card icon="📊" title="Live Analytics" subtitle="Real-time nomination stats">
                  <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                          <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 && (session.phase === 'results' || session.phase === 'closed') ? '#F59E0B' : (index % 2 === 0 ? '#1E40AF' : '#2563EB')} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p>Waiting for nominations...</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Manage Nominations */}
                <Card icon="📝" title="Manage Nominations" subtitle={`Total: ${nominations.length}`}>
                  <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {nominations.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No nominations yet.</p>
                    ) : (
                      nominations.map(n => (
                        <div key={n.id} className="group flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{n.nominee_name}</span>
                              <span className="text-xs text-slate-400">nominated by {n.nominator_name}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">"{n.reason}"</p>
                          </div>
                          <button
                            onClick={() => handleDeleteNomination(n.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Nomination"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Sidebar: Links & Info - ONLY SHOW IF NOT CLOSED */}
              {session.phase !== 'closed' && (
                <div className="space-y-6">
                  <Card icon="🔗" title="Share Session" subtitle="Join Link">
                    <div className="flex flex-col items-center gap-6 p-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <QRCode value={sessionUrl} size={150} />
                      </div>
                      <div className="w-full space-y-3">
                        <div className="flex items-center gap-2 w-full">
                          <code className="flex-1 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono truncate">
                            {sessionUrl}
                          </code>
                          <button
                            onClick={() => { navigator.clipboard.writeText(sessionUrl); showSuccess("Copied!"); }}
                            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                            title="Copy Link"
                          >
                            📋
                          </button>
                        </div>
                        <p className="text-xs text-center text-slate-500 leading-relaxed">
                          Share this QR code or use the buttons below to invite participants.
                        </p>

                        <div className="grid grid-cols-2 gap-3 w-full pt-1">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Join our recognition session here: ${sessionUrl}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            WhatsApp
                          </a>
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: 'Join Recognition Session',
                                  text: 'Click to join our recognition session',
                                  url: sessionUrl,
                                }).catch(console.error);
                              } else {
                                showSuccess("Sharing not supported on this device");
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all shadow-sm"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Shared UI primitives ──────────────────────────────────── */
function Card({ icon, title, subtitle, headerRight, children }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
      {(icon || title) && (
        <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            {icon && <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-white shadow-sm border border-slate-100">{icon}</div>}
            {title && <div>
              <p className="font-semibold text-slate-900 text-sm">{title}</p>
              {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
            </div>}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function LightInput({ ...props }) {
  return (
    <input {...props}
      className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border border-slate-200" />
  );
}

function GradientBtn({ children, ...props }) {
  return (
    <button {...props}
      className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 bg-hexa-primary hover:bg-hexa-secondary">
      {children}
    </button>
  );
}
