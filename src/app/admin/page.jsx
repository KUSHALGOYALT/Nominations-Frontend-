"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import {
  getSession,
  createSession,
  patchSession,
  getParticipants,
  createParticipants,
  sendParticipantEmails,
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
  nomination: { dot: "bg-emerald-400" },
  voting: { dot: "bg-blue-400" },
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
export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newTitle, setNewTitle] = useState("Fortnightly Goal Review");
  const [newDate, setNewDate] = useState("");
  const [advanceLoading, setAdvanceLoading] = useState(false);

  // Participant add state
  const [newEmails, setNewEmails] = useState("");
  const [participantLoading, setParticipantLoading] = useState(false);

  // QR state
  const [expandedQR, setExpandedQR] = useState(null); // email of participant to show QR for

  // Email state
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!window.sessionStorage.getItem("adminPassword")) router.replace("/");
  }, [mounted, router]);

  const isAuthenticated = typeof window !== "undefined" && !!window.sessionStorage.getItem("adminPassword");

  function handleToggleSelect(email) {
    const next = new Set(selectedEmails);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setSelectedEmails(next);
  }

  function handleToggleSelectAll() {
    if (selectedEmails.size === participants.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(participants.map(p => p.email)));
    }
  }

  async function handleSendEmails() {
    if (selectedEmails.size === 0) return;
    setSendingEmails(true);
    setError("");

    const res = await sendParticipantEmails(Array.from(selectedEmails), getAdminPassword());
    setSendingEmails(false);

    if (res.error) {
      if (res.error === "Unauthorized") { handleUnauthorized(); return; }
      setError(res.error);
      return;
    }

    showSuccess(`Sent ${res.sent} emails!`);
    setSelectedEmails(new Set());
  }

  const loadSession = useCallback(async () => {
    const data = await getSession();
    setSession(data.session ?? null);
    return data.session;
  }, []);

  const loadParticipants = useCallback(async () => {
    if (!isAuthenticated) return;
    const data = await getParticipants(getAdminPassword());
    if (data.error === "Unauthorized") {
      handleUnauthorized();
      return;
    }
    setParticipants(data.participants || []);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([loadSession(), loadParticipants()]).then(() => setLoading(false));
    }
  }, [loadSession, loadParticipants, isAuthenticated]);

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
    if (res.error) { if (res.error === "Unauthorized") handleUnauthorized(); else setError(res.error); return; }
    setSession(res.session);
    showSuccess(`Phase advanced to ${PHASE_LABELS[next]}!`);
    loadSession();
  }

  async function handleAddParticipants(e) {
    e.preventDefault();
    setError("");
    setParticipantLoading(true);
    const res = await createParticipants({ emails: newEmails }, getAdminPassword());
    setParticipantLoading(false);

    if (res.error) {
      if (res.error === "Unauthorized") { handleUnauthorized(); return; }
      setError(res.error);
      return;
    }
    setNewEmails("");
    showSuccess(res.message);
    loadParticipants();
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
  const origin = typeof window !== "undefined" ? (window.location.hostname === "localhost" ? "https://nominations-frontend.vercel.app" : window.location.origin) : "";

  return (
    <div className="min-h-screen text-slate-800" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10 py-4 backdrop-blur-xl bg-white/70 border-b border-blue-100/50">
        <div className="flex items-center gap-3">
          <img src="/hexa-logo.png"
            alt="Hexa Climate" className="h-8 w-auto" />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:inline-block bg-blue-100 text-blue-700 border border-blue-200">
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

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recognition Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Manage sessions &amp; participants</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl text-sm bg-red-50 border border-red-200 text-red-600">
            <span className="flex-shrink-0">⚠️</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 p-4 rounded-2xl text-sm bg-green-50 border border-green-200 text-green-700">
            <span className="flex-shrink-0">✅</span><span>{success}</span>
          </div>
        )}

        {!session ? (
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
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h2 className="font-bold text-slate-900 text-lg truncate">{session.title}</h2>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-100 text-blue-600">
                      <span className={`w-2 h-2 rounded-full ${phaseInfo.dot}`}
                        style={session.phase !== "closed" ? { animation: "pulseGlow 2s ease-in-out infinite" } : {}} />
                      {PHASE_LABELS[session.phase]}
                    </span>
                  </div>
                  {session.meeting_date && <p className="text-slate-500 text-sm mb-4">{session.meeting_date}</p>}

                  {/* Phase stepper */}
                  <div className="flex items-center mt-2 overflow-x-auto pb-1">
                    {PHASES.filter(p => p !== "closed").map((p, i) => {
                      const idx = PHASES.indexOf(p);
                      const done = idx < phaseIdx;
                      const active = p === session.phase;
                      return (
                        <div key={p} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                              style={{
                                background: done ? "#14B8A6" : active ? "#E0F2FE" : "#F1F5F9",
                                border: done ? "2px solid #14B8A6" : active ? "2px solid #38BDF8" : "2px solid #CBD5E1",
                                color: done ? "#fff" : active ? "#0284C7" : "#64748B",
                              }}>
                              {done ? "✓" : i + 1}
                            </div>
                            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active ? "text-blue-600" : done ? "text-teal-600" : "text-slate-400"}`}>
                              {PHASE_LABELS[p]}
                            </span>
                          </div>
                          {i < 3 && (
                            <div className="h-px w-10 sm:w-14 mx-1 mb-4 flex-shrink-0"
                              style={{ background: done ? "#14B8A6" : "#E2E8F0" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {nextPhase && session.phase !== "closed" && (
                  <button onClick={handleAdvancePhase} disabled={advanceLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow flex-shrink-0 bg-blue-600 hover:bg-blue-700">
                    {advanceLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: "spin 0.8s linear infinite" }} />
                      : <span>{nextPhase.icon}</span>}
                    {nextPhase.label}
                  </button>
                )}
              </div>
            </Card>

            <Card icon="👥" title="Participants" subtitle="Manage & Share QR Codes">
              <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                <p><strong>Note:</strong> To add or remove participants, please use the <a href="/admin" target="_blank" className="underline hover:text-blue-600">Django Admin Panel</a>.</p>
                <p className="mt-1 opacity-80">Syncing is automatic. Refresh this page after changes.</p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-600">All Participants ({participants.length})</h3>
                  {participants.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs text-blue-600 hover:text-blue-500 transition-colors font-medium"
                      >
                        {selectedEmails.size === participants.length ? "Deselect All" : "Select All"}
                      </button>
                      {selectedEmails.size > 0 && (
                        <button
                          type="button"
                          onClick={handleSendEmails}
                          disabled={sendingEmails}
                          className="text-xs bg-blue-600 px-3 py-1 rounded text-white hover:bg-blue-500 disabled:opacity-50 transition-colors shadow"
                        >
                          {sendingEmails ? "Sending..." : `Send Email (${selectedEmails.size})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {participants.length === 0 ? (
                  <p className="text-slate-400 text-sm">No participants found.</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p) => {
                      const isExpanded = expandedQR === p.email;
                      const isSelected = selectedEmails.has(p.email);
                      const url = `${origin}/vote?token=${p.token}`;
                      return (
                        <div key={p.email} className={`p-3 rounded-lg border transition-colors ${isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:border-blue-300"}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(p.email)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white cursor-pointer"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-slate-900 truncate">{p.email}</span>
                                <span className="text-xs text-slate-500 truncate">Token: ...{p.token ? p.token.slice(-4) : ''}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setExpandedQR(isExpanded ? null : p.email)}
                              className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex-shrink-0 transition-colors border border-slate-200"
                            >
                              {isExpanded ? "Hide QR" : "Show QR"}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                              <QRCode value={url} size={150} />
                              <p className="mt-2 text-xs text-slate-600 break-all text-center max-w-xs select-all bg-white p-2 rounded border border-slate-200 font-mono">{url}</p>
                              <a href={`mailto:${p.email}?subject=Your Voting Link&body=Please vote here: ${url}`} className="mt-2 text-xs text-blue-600 hover:underline">
                                Open in Email Client
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </>
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
      className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 bg-blue-600 hover:bg-blue-700">
      {children}
    </button>
  );
}
