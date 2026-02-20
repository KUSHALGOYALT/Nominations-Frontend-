"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getSession,
  getNominations,
  createNomination,
  createVote
} from "@/lib/api";

function VoteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromUrl = searchParams.get("session_id") || null;
  const urlError = searchParams.get("error");

  // Simple Name-based Auth
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Local state tracking
  const [hasNominated, setHasNominated] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [skippedNomination, setSkippedNomination] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Join State
  const [inputName, setInputName] = useState("");

  // Data for phases
  const [nominees, setNominees] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [nominationsLoading, setNominationsLoading] = useState(false);

  // Form state
  const [nomineeName, setNomineeName] = useState("");
  const [reason, setReason] = useState("");
  const [selectedNominationIds, setSelectedNominationIds] = useState([]);
  const [voteNone, setVoteNone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentSessionId = sessionIdFromUrl || session?.id;

  const loadSession = () => {
    getSession(sessionIdFromUrl).then(data => {
      if (data && data.session) {
        setSession(data.session);
        if ((data.session.phase || "").toLowerCase() === "voting") {
          const sid = sessionIdFromUrl || data.session.id;
          getNominations(sid).then(res => setNominations(res.nominations || []));
        }
      }
    });
  };

  useEffect(() => {
    // Per-session join: when URL has session_id, only use name if they joined THIS session before.
    // New meeting = new session_id = no stored join = show "Enter your name". Never use another session's data.
    if (typeof window !== "undefined") {
      if (sessionIdFromUrl) {
        const joinedName = localStorage.getItem(`hexa_join_${sessionIdFromUrl}`);
        if (joinedName) setName(joinedName);
        else setName(""); // New session or different person: clear so join form shows
      } else {
        const storedName = localStorage.getItem("hexa_name");
        if (storedName) setName(storedName);
        else setName("");
      }
    }

    if (urlError) {
      setLoading(false);
      if (urlError === "missing_session") setError("This link is missing the meeting. Use the QR or link from your host.");
      else if (urlError === "invalid_session") setError("This meeting link is invalid or the meeting no longer exists.");
      else if (urlError === "session_ended") setError("This meeting has ended.");
      else setError("Something went wrong. Try the link from your host again.");
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      setError("Taking too long — check your connection and try again.");
    }, 12000);

    getSession(sessionIdFromUrl)
      .then(data => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setLoading(false);
        setError("");
        if (data?.session) {
          setSession(data.session);
          if ((data.session.phase || "").toLowerCase() === "voting") {
            setNominationsLoading(true);
            const sid = sessionIdFromUrl || data.session.id;
            getNominations(sid)
              .then(res => {
                if (!cancelled) setNominations(res.nominations || []);
              })
              .finally(() => { if (!cancelled) setNominationsLoading(false); });
          }
        } else if (sessionIdFromUrl && (data?.error === "Session not found" || !data?.session)) {
          setError("This meeting link is invalid or the meeting no longer exists.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setLoading(false);
          setError("Couldn't load session. Check your connection or try again.");
        }
      });

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [sessionIdFromUrl, urlError]);

  // Poll session so when admin moves to voting, we show voting UI without refresh
  useEffect(() => {
    if (!session?.id) return;
    const t = setInterval(loadSession, 5000);
    return () => clearInterval(t);
  }, [session?.id]);

  // When phase is voting, ensure we have nominations list (and refetch when session changes)
  useEffect(() => {
    if ((session?.phase || "").toLowerCase() !== "voting" || !session?.id) return;
    const sid = sessionIdFromUrl || session.id;
    setNominations([]);
    setNominationsLoading(true);
    getNominations(sid)
      .then(res => setNominations(res.nominations || []))
      .finally(() => setNominationsLoading(false));
  }, [session?.phase, sessionIdFromUrl, session?.id]);

  // When session in URL changes (new meeting), reset all in-page state so we never show previous meeting's data
  useEffect(() => {
    setHasNominated(false);
    setHasVoted(false);
    setSkippedNomination(false);
    setNominations([]);
    setSuccess("");
    setError("");
    setSelectedNominationIds([]);
    setVoteNone(false);
  }, [sessionIdFromUrl]);

  // Pre-fill join form with last-used name only when field is still empty (never overwrite what user typed)
  useEffect(() => {
    if (sessionIdFromUrl && session && !name && typeof window !== "undefined") {
      const lastName = localStorage.getItem("hexa_name");
      if (lastName) setInputName(prev => (prev === "" ? lastName : prev));
    }
  }, [sessionIdFromUrl, session, name]);

  // Pre-fill pitch name with joined name when entering nomination phase
  useEffect(() => {
    if (name && (session?.phase || "").toLowerCase() === "nomination" && !nomineeName) {
      setNomineeName(name);
    }
  }, [name, session?.phase]);

  function handleJoin(e) {
    e.preventDefault();
    if (!inputName.trim()) return;

    const trimmed = inputName.trim();
    localStorage.setItem("hexa_name", trimmed);
    if (sessionIdFromUrl) localStorage.setItem(`hexa_join_${sessionIdFromUrl}`, trimmed);
    setName(trimmed);
  }

  function handleLogout() {
    if (sessionIdFromUrl) localStorage.removeItem(`hexa_join_${sessionIdFromUrl}`);
    localStorage.removeItem("hexa_name");
    setName("");
    setInputName("");
    setHasNominated(false);
    setHasVoted(false);
    setSkippedNomination(false);
  }

  async function handleSubmitNomination(e) {
    e.preventDefault();
    if (!nomineeName || !reason) return;
    setSubmitting(true);
    const res = await createNomination(name, nomineeName, reason, currentSessionId);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Nomination submitted successfully!");
      setHasNominated(true);
    }
  }

  async function handleSubmitVote(e) {
    e.preventDefault();
    // Validate: Either None is true OR at least one ID is selected
    if (!voteNone && selectedNominationIds.length === 0) return;

    setSubmitting(true);
    // Send empty list if None is selected
    const payload = voteNone ? [] : selectedNominationIds;
    const res = await createVote(name, payload, currentSessionId);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Vote submitted successfully!");
      setHasVoted(true);
    }
  }

  const handleRetry = () => {
    setError("");
    setLoading(true);
    getSession(sessionIdFromUrl)
      .then(data => {
        if (data?.session) {
          setSession(data.session);
          if ((data.session.phase || "").toLowerCase() === "voting") {
            setNominationsLoading(true);
            getNominations(sessionIdFromUrl || data.session.id)
              .then(res => setNominations(res.nominations || []))
              .finally(() => setNominationsLoading(false));
          }
        } else if (sessionIdFromUrl) setError("This meeting link is invalid or no longer exists.");
      })
      .catch(() => setError("Couldn't load session. Try again."))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }}>
        <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
        <p className="text-slate-500 text-sm mt-4">Loading session…</p>
      </div>
    );
  }

  // ── Load error (e.g. after scan, API unreachable) ──
  if (error && !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }}>
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <p className="text-4xl mb-4">📡</p>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Couldn’t load session</h1>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── SESSION STATUS CHECKS (Before Join) ──
  if (!session) {
    return (
      <div className="min-h-screen text-slate-800 p-6 flex flex-col items-center justify-center bg-white">
        <p className="text-xl text-slate-500">No active session at the moment.</p>
        <p className="text-sm text-slate-400 mt-2">Please check back later.</p>
      </div>
    );
  }

  if ((session.phase || "").toLowerCase() === "closed") {
    return (
      <div className="min-h-screen text-slate-800 p-6 flex flex-col items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Closed</h1>
          <p className="text-slate-500">The session "{session.title}" has ended.</p>
        </div>
      </div>
    );
  }

  // ── JOIN SCREEN (e.g. after scanning QR or opening /vote) ──
  if (!name) {
    const phaseLower = (session.phase || "").toLowerCase();
    const isSetup = phaseLower === "setup";
    return (
      <div className="min-h-screen text-slate-800 p-6 flex flex-col items-center justify-center bg-white">
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }} />
        <div className="max-w-md w-full bg-white border border-blue-100 rounded-3xl p-8 shadow-2xl shadow-blue-900/10 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Join Session</h1>
            <p className="text-slate-500 text-sm">
              Scanned the QR code? Enter your name below to join this recognition session.
            </p>
            {isSetup && (
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Session is in setup. Once the admin opens nominations, you can pitch or skip and vote later.
              </p>
            )}
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Current Session</p>
              <p className="text-slate-800 font-medium">{session.title}</p>
              <p className="text-xs text-slate-500 mt-1 capitalize">{phaseLower || "setup"} phase</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">Your name</label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Type your name here..."
                className="w-full rounded-xl px-4 py-4 bg-white border-2 border-slate-300 text-black placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg shadow-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!inputName.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-hexa-primary hover:bg-hexa-secondary disabled:opacity-50 transition-colors shadow-lg"
            >
              Continue
            </button>
          </form>
        </div>
        <footer className="mt-8 text-xs text-slate-400 text-center relative z-10">© 2026 Hexa Climate</footer>
      </div>
    );
  }

  /* ── Current Phase Component ── */
  let content = null;
  const phase = (session?.phase || "").toLowerCase();

  if (!session) {
    content = <p className="text-slate-500">No active session at the moment.</p>;
  } else if (phase === "setup") {
    content = (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-4">🕒</p>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Session is being set up</h2>
        <p className="text-slate-600 text-sm">When the admin opens <strong>nominations</strong>, you’ll see a form here to submit your pitch (or skip and only vote). This page updates automatically every few seconds.</p>
      </div>
    );
  } else if (phase === "closed") {
    content = <div className="text-center py-8"><p className="text-xl">🔒</p><p className="mt-2 text-slate-500">This session is closed.</p></div>;
  } else if (phase === "results") {
    content = <div className="text-center py-8"><p className="text-xl">🏆</p><p className="mt-2 text-slate-500">Results are being announced!</p></div>;
  }

  // Nomination Phase
  else if (phase === "nomination") {
    if (hasNominated || success) {
      content = (
        <div className="bg-hexa-light border border-blue-200 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2">✅</p>
          <h3 className="text-lg font-semibold text-hexa-primary">Pitch Submitted!</h3>
          <p className="text-sm text-slate-600 mt-3">Thanks, {name}. When the admin opens voting, <strong>your pitch will appear as one of the options</strong> on the ballot. You can then vote for yourself, others, or None of the Above.</p>
          <button onClick={() => setSuccess("")} className="text-xs text-hexa-secondary underline mt-4">Submit another?</button>
        </div>
      );
    } else if (skippedNomination) {
      content = (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2">👍</p>
          <h3 className="text-lg font-semibold text-slate-800">No pitch — you’ll just vote</h3>
          <p className="text-sm text-slate-600 mt-3">When the admin opens the voting phase, this page will show the ballot. You can stay here or come back later.</p>
        </div>
      );
    } else {
      content = (
        <div className="space-y-4 text-left">
          <div className="bg-hexa-light border border-blue-200 p-4 rounded-xl text-sm text-hexa-primary mb-4">
            <p><strong>Pitch phase:</strong> Tell us why you should be recognized (optional).</p>
          </div>
          <form onSubmit={handleSubmitNomination} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your name (for pitch)</label>
              <input
                type="text"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                placeholder="Same as join name or different..."
                className="w-full rounded-xl px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your pitch</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why should people vote for you?"
                rows={4}
                className="w-full rounded-xl px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 min-h-[120px] resize-y"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !nomineeName?.trim() || !reason?.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-hexa-primary hover:bg-hexa-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {submitting ? "Submitting…" : "Submit Pitch"}
            </button>
          </form>
          <div className="pt-2 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => setSkippedNomination(true)}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Skip — I’ll just vote later
            </button>
          </div>
        </div>
      );
    }
  }

  // Voting Phase
  else if (phase === "voting") {
    if (hasVoted || success) {
      content = (
        <div className="bg-hexa-light border border-blue-200 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2">🗳️</p>
          <h3 className="text-lg font-semibold text-hexa-primary">Vote Cast</h3>
          <p className="text-sm text-slate-600 mt-1">Thanks for voting, {name}!</p>
          <p className="text-xs text-slate-500 mt-3">You won’t be asked to nominate or vote again in this session.</p>
        </div>
      );
    } else if (nominationsLoading) {
      content = (
        <div className="py-8 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-slate-500 text-sm mt-3">Loading vote options…</p>
        </div>
      );
    } else if (nominations.length === 0) {
      // No nominees: still show ballot with only "None of the Above" so they can cast a vote
      content = (
        <form onSubmit={handleSubmitVote} className="space-y-4 text-left">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 mb-4">
            <p><strong>No one submitted a pitch</strong> in this session, so there are no nominees to choose from. You can still cast &quot;None of the Above&quot; below.</p>
          </div>
          <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${voteNone ? "bg-red-50 border-red-300 shadow-sm" : "bg-white border-slate-200 hover:border-red-300"}`}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={voteNone}
                onChange={() => setVoteNone(prev => !prev)}
                className="w-5 h-5 rounded border-slate-300 text-red-500 focus:ring-red-500 bg-white"
              />
              <span className="font-semibold text-slate-700">None of the Above</span>
            </div>
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !voteNone}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-hexa-primary hover:bg-hexa-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 shadow-lg"
          >
            {submitting ? "Submitting..." : "Cast Vote"}
          </button>
        </form>
      );
    } else {
      // Helper to handle checkbox changes
      const handleCheckboxChange = (id) => {
        setSelectedNominationIds(prev => {
          if (prev.includes(id)) {
            return prev.filter(item => item !== id);
          } else {
            if (prev.length >= 3) return prev; // Max 3
            return [...prev, id];
          }
        });
        setVoteNone(false); // Deselect None if a candidate is picked
      };

      const handleNoneChange = () => {
        setVoteNone(prev => {
          if (!prev) setSelectedNominationIds([]); // Clear candidates if None selected
          return !prev;
        });
      };

      content = (
        <form onSubmit={handleSubmitVote} className="space-y-4 text-left">
          <div className="bg-hexa-light border border-blue-200 p-4 rounded-xl text-sm text-hexa-primary mb-4">
            <p><strong>Everyone can vote</strong> — whether you pitched or not.</p>
            <p className="mt-1">Select up to <strong>3</strong> candidates (you can vote for yourself if you pitched) OR select "None of the Above".</p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {nominations.map(n => {
              const isYou = name && String(n.nominee_name).trim().toLowerCase() === String(name).trim().toLowerCase();
              return (
                <label key={n.id} className={`block p-4 rounded-xl border cursor-pointer transition-all ${selectedNominationIds.includes(n.id) ? "bg-blue-50 border-blue-400 shadow-sm" : "bg-white border-slate-200 hover:border-blue-300"}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNominationIds.includes(n.id)}
                      onChange={() => handleCheckboxChange(n.id)}
                      disabled={voteNone}
                      className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {n.nominee_name}
                        {isYou && <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">You</span>}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">"{n.reason}"</p>
                    </div>
                  </div>
                </label>
              );
            })}

            {/* None of the Above Option */}
            <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${voteNone ? "bg-red-50 border-red-300 shadow-sm" : "bg-white border-slate-200 hover:border-red-300"}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={voteNone}
                  onChange={handleNoneChange}
                  className="w-5 h-5 rounded border-slate-300 text-red-500 focus:ring-red-500 bg-white"
                />
                <span className="font-semibold text-slate-700">None of the Above</span>
              </div>
            </label>

          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={submitting || (!voteNone && selectedNominationIds.length === 0)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-hexa-primary hover:bg-hexa-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 shadow-lg"
          >
            {submitting ? "Submitting..." : "Cast Vote"}
          </button>
        </form>
      );
    }
  }

  return (
    <div className="min-h-screen text-slate-800 p-6 flex flex-col items-center justify-center bg-white">
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }} />
      <div className="relative z-10 max-w-md w-full bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-hexa-primary to-hexa-secondary rounded-full flex items-center justify-center text-3xl shadow-lg mb-4 text-white">
            👋
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hello, {name}!</h1>
          <button onClick={handleLogout} className="text-xs text-slate-400 underline mt-1">Not you?</button>
        </div>

        {session && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 text-center">
            <p className="text-xs text-blue-600 uppercase tracking-widest font-semibold mb-1">Active Session</p>
            <p className="font-medium text-lg text-slate-800">{session.title}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${phase === "nomination" ? "bg-emerald-500" : phase === "voting" ? "bg-blue-500" : "bg-slate-400"} animate-pulse`} />
              <p className="text-xs text-slate-500 capitalize">{phase} phase</p>
            </div>
          </div>
        )}

        <div className="min-h-[200px] w-full">
          {content != null ? content : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-sm text-amber-800">
              <p>Nothing to show for this phase yet. The page will update when the admin changes the session.</p>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-8 text-xs text-slate-400 text-center">
        © 2026 Hexa Climate
      </footer>
    </div>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50" />}>
      <VoteContent />
    </Suspense>
  );
}
