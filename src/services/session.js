const SESSION_KEY = "gl_chat_session_id";

function createSessionId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `session_${Date.now()}_${rand}`;
}

export function getOrCreateSessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const sessionId = createSessionId();
  localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

export function getLocale() {
  return "ar";
}

export function setLocale() {
  return "ar";
}
