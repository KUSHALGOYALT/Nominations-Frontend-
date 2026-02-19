const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "https://nominations-backend.onrender.com/api") : "";

export function checkAdminPassword(password) {
  return fetch(`${API_BASE}/auth/check`, {
    headers: { Authorization: `Bearer ${password}` },
  }).then((r) => ({ ok: r.ok, status: r.status }));
}

export function getSession() {
  return fetch(`${API_BASE}/session`).then((r) => r.json());
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

export function checkParticipantToken(token) {
  return fetch(`${API_BASE}/participants/check?token=${token}`).then((r) => r.json());
}

export function sendParticipantEmails(emails, password) {
  return fetch(`${API_BASE}/participants/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
    body: JSON.stringify({ emails }),
  }).then((r) => r.json());
}

export function getNominations() {
  return fetch(`${API_BASE}/nominations`).then((r) => r.json());
}

export function GetNominees(token) {
  // Deprecated: nominations are now free-text
  return Promise.resolve({ nominees: [] });
}

export function createNomination(token, nomineeName, reason) {
  return fetch(`${API_BASE}/nominations/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, nominee_name: nomineeName, reason }),
  }).then((r) => r.json());
}

export function createVote(token, nominationIds) {
  return fetch(`${API_BASE}/votes/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, nomination_ids: nominationIds }),
  }).then((r) => r.json());
}
