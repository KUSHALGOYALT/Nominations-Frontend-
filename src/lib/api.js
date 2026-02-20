const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "https://nominations-backend.onrender.com/api") : "";

export function checkAdminPassword(password) {
  return fetch(`${API_BASE}/auth/check`, {
    headers: { Authorization: `Bearer ${password}` },
  }).then((r) => ({ ok: r.ok, status: r.status }));
}

export function getSession(sessionId) {
  const url = sessionId ? `${API_BASE}/session?session_id=${sessionId}` : `${API_BASE}/session`;
  return fetch(url).then((r) => r.json());
}

export function createSession(body, password) {
  return fetch(`${API_BASE}/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

export function patchSession(body, password) {
  return fetch(`${API_BASE}/session/patch`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

export function getParticipants(password) {
  return fetch(`${API_BASE}/participants`, {
    headers: { Authorization: `Bearer ${password}` },
  }).then((r) => r.json());
}

export function createParticipants(body, password) {
  return fetch(`${API_BASE}/participants/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

export async function joinSession(name) {
  try {
    const res = await fetch(`${API_BASE}/auth/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return await res.json();
  } catch (err) {
    return { error: "Failed to join session" };
  }
}

export function getNominations(sessionId) {
  const url = sessionId ? `${API_BASE}/nominations?session_id=${sessionId}` : `${API_BASE}/nominations`;
  return fetch(url).then((r) => r.json());
}

export function GetNominees(token) {
  // Deprecated: nominations are now free-text
  return Promise.resolve({ nominees: [] });
}

// Nominations
export async function createNomination(nominatorName, nomineeName, reason, sessionId) {
  try {
    const body = { nominator_name: nominatorName, nominee_name: nomineeName, reason };
    if (sessionId != null) body.session_id = sessionId;
    const res = await fetch(`${API_BASE}/nominations/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    return { error: "Failed to submit nomination" };
  }
}

export async function deleteNomination(id, password) {
  try {
    const res = await fetch(`${API_BASE}/nominations/${id}/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${password}` },
    });
    return await res.json();
  } catch (err) {
    return { error: "Failed to delete nomination" };
  }
}

// Votes
export async function createVote(voterName, nominationIds, sessionId) {
  try {
    const body = { voter_name: voterName, nomination_ids: nominationIds };
    if (sessionId != null) body.session_id = sessionId;
    const res = await fetch(`${API_BASE}/votes/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    return { error: "Failed to submit vote" };
  }
}
