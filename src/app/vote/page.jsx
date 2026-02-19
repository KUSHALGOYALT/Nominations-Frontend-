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
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Verifying token...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-2xl max-w-sm text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm opacity-80">{error}</p>
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
    content = <div className="text-center py-8"><p className="text-xl">🕒</p><p className="mt-2 text-slate-300">Session is being set up. Check back soon!</p></div>;
  } else if (phase === "closed") {
    content = <div className="text-center py-8"><p className="text-xl">🔒</p><p className="mt-2 text-slate-300">This session is closed.</p></div>;
  } else if (phase === "results") {
    content = <div className="text-center py-8"><p className="text-xl">🏆</p><p className="mt-2 text-slate-300">Results are being announced!</p></div>;
  }

  // Nomination Phase
  else if (phase === "nomination") {
    if (userState.has_nominated || success) {
      content = (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2"></p>
          <h3 className="text-lg font-semibold text-emerald-400">Pitch Received!</h3>
          <p className="text-sm text-emerald-200/70 mt-3">
            Please wait for all nominations to come in.
            <br />
            <strong>You will vote right here</strong> when the voting phase starts.
          </p>
        </div>
      );
    } else {
      content = (
        <form onSubmit={handleSubmitNomination} className="space-y-4 text-left">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200 mb-4">
            <p><strong>Pitch Phase:</strong> Tell us why you should be recognized!</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name</label>
            <input
              type="text"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Pitch</label>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why should people vote for you?"
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]"
            />
          </div>
          <button
            type="submit" disabled={submitting || !nomineeName || !reason}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-center">
          <p className="text-2xl mb-2">🗳️</p>
          <h3 className="text-lg font-semibold text-emerald-400">Vote Cast</h3>
          <p className="text-sm text-emerald-200/70 mt-1">Thanks for voting!</p>
        </div>
      );
    } else if (nominations.length === 0) {
      content = <p className="text-slate-400 py-4">No nominations to vote on yet.</p>;
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
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200 mb-4">
            <p><strong>Instructions:</strong> Select up to <strong>3</strong> candidates OR select "None of the Above".</p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {nominations.map(n => (
              <label key={n.id} className={`block p-4 rounded-xl border cursor-pointer transition-all ${selectedNominationIds.includes(n.id) ? "bg-teal-500/20 border-teal-500" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedNominationIds.includes(n.id)}
                    onChange={() => handleCheckboxChange(n.id)}
                    disabled={voteNone}
                    className="mt-1 w-5 h-5 rounded border-slate-500 text-teal-500 focus:ring-teal-500 bg-transparent"
                  />
                  <div>
                    <p className="font-semibold text-teal-300">{n.nominee_name}</p>
                    <p className="text-sm text-slate-300 mt-1">"{n.reason}"</p>
                  </div>
                </div>
              </label>
            ))}

            {/* None of the Above Option */}
            <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${voteNone ? "bg-red-500/10 border-red-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={voteNone}
                  onChange={handleNoneChange}
                  className="w-5 h-5 rounded border-slate-500 text-red-500 focus:ring-red-500 bg-transparent"
                />
                <span className="font-semibold text-slate-300">None of the Above</span>
              </div>
            </label>

          </div>
          <button
            type="submit" disabled={submitting || (!voteNone && selectedNominationIds.length === 0)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4"
          >
            {submitting ? "Submitting..." : "Cast Vote"}
          </button>
        </form>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#050d1a] text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-lg mb-4">
            👋
          </div>
          <h1 className="text-2xl font-bold">Hello!</h1>
          <p className="text-slate-400 text-sm mt-1">{participant.email}</p>
        </div>

        {session && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-8 text-center">
            <p className="text-xs text-teal-400 uppercase tracking-widest font-semibold mb-1">Active Session</p>
            <p className="font-medium text-lg">{session.title}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${phase === 'nomination' ? 'bg-emerald-400' : phase === 'voting' ? 'bg-blue-400' : 'bg-slate-400'} animate-pulse`}></span>
              <p className="text-xs text-slate-300 capitalize">{phase} Phase</p>
            </div>
          </div>
        )}

        {content}

      </div>
    </div>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050d1a]" />}>
      <VoteContent />
    </Suspense>
  );
}
