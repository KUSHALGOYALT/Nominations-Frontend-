"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  checkParticipantToken,
  getNominees,
  getNominations,
  createNomination,
  createVote
} from "@/lib/api";

function VoteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [participant, setParticipant] = useState(null);
  const [session, setSession] = useState(null);
  const [userState, setUserState] = useState({ has_nominated: false, has_voted: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    if (!token) {
      setError("No token provided.");
      setLoading(false);
      return;
    }

    checkParticipantToken(token).then((data) => {
      if (data.error) {
        setError(data.error);
      } else {
        setParticipant(data.participant);
        setSession(data.session);
        setUserState({ has_nominated: data.has_nominated, has_voted: data.has_voted });

        // Load phase-specific data
        if (data.session?.phase === "voting" && !data.has_voted) {
          getNominations().then(res => setNominations(res.nominations || []));
        }
      }
      setLoading(false);
    });
  }, [token]);

  async function handleSubmitNomination(e) {
    e.preventDefault();
    if (!nomineeName || !reason) return;
    setSubmitting(true);
    const res = await createNomination(token, nomineeName, reason);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Nomination submitted successfully!");
      setUserState(prev => ({ ...prev, has_nominated: true }));
    }
  }

  async function handleSubmitVote(e) {
    e.preventDefault();
    // Validate: Either None is true OR at least one ID is selected
    if (!voteNone && selectedNominationIds.length === 0) return;

    setSubmitting(true);
    // Send empty list if None is selected
    const payload = voteNone ? [] : selectedNominationIds;
    const res = await createVote(token, payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Vote submitted successfully!");
      setUserState(prev => ({ ...prev, has_voted: true }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Verifying token...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-sm text-center shadow-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm opacity-90">{error}</p>
        </div>
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
    if (userState.has_nominated || success) {
      content = (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2"></p>
          <h3 className="text-lg font-semibold text-emerald-700">Pitch Received!</h3>
          <p className="text-sm text-emerald-600 mt-3">
            Please wait for all nominations to come in.
            <br />
            <strong>You will vote right here</strong> when the voting phase starts.
          </p>
        </div>
      );
    } else {
      content = (
        <form onSubmit={handleSubmitNomination} className="space-y-4 text-left">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-700 mb-4">
            <p><strong>Pitch Phase:</strong> Tell us why you should be recognized!</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
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
          <button
            type="submit" disabled={submitting || !nomineeName || !reason}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {submitting ? "Submitting..." : "Submit Pitch"}
          </button>
        </form>
      );
    }
  }

  // Voting Phase
  else if (phase === "voting") {
    if (userState.has_voted || success) {
      content = (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2">🗳️</p>
          <h3 className="text-lg font-semibold text-emerald-700">Vote Cast</h3>
          <p className="text-sm text-emerald-600 mt-1">Thanks for voting!</p>
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
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-700 mb-4">
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
          <button
            type="submit" disabled={submitting || (!voteNone && selectedNominationIds.length === 0)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 shadow-lg"
          >
            {submitting ? "Submitting..." : "Cast Vote"}
          </button>
        </form>
      );
    }
  }

  return (
    <div className="min-h-screen text-slate-800 p-6 flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}>
      <div className="max-w-md w-full bg-white border border-blue-100 rounded-3xl p-8 shadow-2xl shadow-blue-900/10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-3xl shadow-lg mb-4 text-white">
            👋
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hello!</h1>
          <p className="text-slate-500 text-sm mt-1">{participant.email}</p>
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
