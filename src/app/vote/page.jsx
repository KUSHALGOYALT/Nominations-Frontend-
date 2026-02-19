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

  // Simple Name-based Auth
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Local state tracking
  const [hasNominated, setHasNominated] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Join State
  const [inputName, setInputName] = useState("");

  // Data for phases
  const [nominees, setNominees] = useState([]);
  const [nominations, setNominations] = useState([]);

  // Form state
  const [nomineeName, setNomineeName] = useState("");
  const [reason, setReason] = useState("");
  const [selectedNominationIds, setSelectedNominationIds] = useState([]);
  const [voteNone, setVoteNone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Check if name is already stored
    const storedName = typeof window !== 'undefined' ? localStorage.getItem("hexa_name") : null;
    if (storedName) {
      setName(storedName);
    }

    // 2. Fetch Session Info
    getSession().then(data => {
      if (data && data.session) {
        setSession(data.session);
        // Load nominations if in voting phase
        if (data.session.phase === "voting") {
          getNominations().then(res => setNominations(res.nominations || []));
        }
      }
      setLoading(false);
    });

  }, []);

  function handleJoin(e) {
    e.preventDefault();
    if (!inputName.trim()) return;

    // Save name locally
    localStorage.setItem("hexa_name", inputName.trim());
    setName(inputName.trim());
  }

  function handleLogout() {
    localStorage.removeItem("hexa_name");
    setName("");
    setInputName("");
    setHasNominated(false);
    setHasVoted(false);
  }

  async function handleSubmitNomination(e) {
    e.preventDefault();
    if (!nomineeName || !reason) return;
    setSubmitting(true);
    const res = await createNomination(name, nomineeName, reason);
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
    const res = await createVote(name, payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Vote submitted successfully!");
      setHasVoted(true);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Loading...</p>
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

  if (session.phase === "closed") {
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
    return (
      <div className="min-h-screen text-slate-800 p-6 flex flex-col items-center justify-center bg-white">
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)" }} />
        <div className="max-w-md w-full bg-white border border-blue-100 rounded-3xl p-8 shadow-2xl shadow-blue-900/10 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Join Session</h1>
            <p className="text-slate-500 text-sm">
              Scanned the QR code? Enter your name below to join this recognition session.
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Current Session</p>
              <p className="text-slate-800 font-medium">{session.title}</p>
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
  const phase = session?.phase;

  if (!session) {
    content = <p className="text-slate-500">No active session at the moment.</p>;
  } else if (phase === "setup") {
    content = <div className="text-center py-8"><p className="text-xl">🕒</p><p className="mt-2 text-slate-500">Session is being set up. Check back soon!</p></div>;
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
          <p className="text-sm text-slate-600 mt-3">
            Thanks, {name}. Please wait for the voting phase.
          </p>
          <button onClick={() => setSuccess("")} className="text-xs text-hexa-secondary underline mt-4">Submit another?</button>
        </div>
      );
    } else {
      content = (
        <form onSubmit={handleSubmitNomination} className="space-y-4 text-left">
          <div className="bg-hexa-light border border-blue-200 p-4 rounded-xl text-sm text-hexa-primary mb-4">
            <p><strong>Pitch Phase:</strong> Tell us why you should be recognized!</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name (for pitch)</label>
            <input
              type="text"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full rounded-xl px-4 py-3 bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Pitch</label>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why should people vote for you?"
              className="w-full rounded-xl px-4 py-3 bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={submitting || !nomineeName || !reason}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-hexa-primary hover:bg-hexa-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {submitting ? "Submitting..." : "Submit Pitch"}
          </button>
        </form>
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
        </div>
      );
    } else if (nominations.length === 0) {
      content = <p className="text-slate-500 py-4">No nominations to vote on yet.</p>;
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
            <p><strong>Instructions:</strong> Select up to <strong>3</strong> candidates OR select "None of the Above".</p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {nominations.map(n => (
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
                    <p className="font-semibold text-slate-900">{n.nominee_name}</p>
                    <p className="text-sm text-slate-500 mt-1">"{n.reason}"</p>
                  </div>
                </div>
              </label>
            ))}

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
      <div className="max-w-md w-full bg-white border border-blue-100 rounded-3xl p-8 shadow-2xl shadow-blue-900/10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-hexa-primary to-hexa-secondary rounded-full flex items-center justify-center text-3xl shadow-lg mb-4 text-white">
            👋
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hello, {name}!</h1>
          <button onClick={handleLogout} className="text-xs text-slate-400 underline mt-1">Not you?</button>
        </div>

        {session && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-8 text-center">
            <p className="text-xs text-blue-600 uppercase tracking-widest font-semibold mb-1">Active Session</p>
            <p className="font-medium text-lg text-slate-800">{session.title}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${phase === 'nomination' ? 'bg-emerald-500' : phase === 'voting' ? 'bg-blue-500' : 'bg-slate-400'} animate-pulse`}></span>
              <p className="text-xs text-slate-500 capitalize">{phase} Phase</p>
            </div>
          </div>
        )}

        {content}

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
