const { db, admin } = require("../utils/firestore");
const { CHAT_LIMITS } = require("../utils/constants");

/**
 * @param {string} sessionId
 * @param {Record<string, any>} payload
 */
async function touchSession(sessionId, payload = {}) {
  const ref = db.collection("chatSessions").doc(sessionId);
  await ref.set(
    {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      locale: payload.locale === "en" ? "en" : "ar",
      pageContext: payload.pageContext || {},
      userId: payload.userId || null,
      blocked: false,
    },
    { merge: true }
  );
}

/**
 * @param {string} sessionId
 */
async function loadRecentMessages(sessionId) {
  const snapshot = await db
    .collection("chatSessions")
    .doc(sessionId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(CHAT_LIMITS.HISTORY_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .reverse();
}

/**
 * @param {string} sessionId
 * @param {"user"|"assistant"|"system"} role
 * @param {string} text
 * @param {Record<string, any>} metadata
 */
async function saveMessage(sessionId, role, text, metadata = {}) {
  await db.collection("chatSessions").doc(sessionId).collection("messages").add({
    role,
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata,
  });
}

/**
 * @param {string} sessionId
 */
async function deleteSessionTranscript(sessionId) {
  const messagesRef = db.collection("chatSessions").doc(sessionId).collection("messages");
  const batchSize = 250;
  while (true) {
    const snapshot = await messagesRef.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

module.exports = {
  touchSession,
  loadRecentMessages,
  saveMessage,
  deleteSessionTranscript,
};
