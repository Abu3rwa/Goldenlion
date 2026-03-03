const { db, admin } = require("../utils/firestore");
const { CHAT_LIMITS } = require("../utils/constants");
const { AppError } = require("../utils/appError");

/**
 * @param {string} sessionId
 * @param {string} ip
 */
async function enforceRateLimit(sessionId, ip) {
  const nowMs = Date.now();
  const windowMs = CHAT_LIMITS.RATE_LIMIT_WINDOW_MS;
  const bucket = Math.floor(nowMs / windowMs);
  const key = `${sessionId}_${ip || "unknown"}_${bucket}`;
  const docRef = db.collection("rateLimits").doc(key);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const currentCount = snap.exists ? snap.data().count || 0 : 0;
    if (currentCount >= CHAT_LIMITS.RATE_LIMIT_MAX_REQUESTS) {
      throw new AppError("rate-limit/exceeded", "Too many messages. Please wait a moment.", 429);
    }
    tx.set(
      docRef,
      {
        count: currentCount + 1,
        sessionId,
        ip: ip || "unknown",
        windowStartedAt: admin.firestore.Timestamp.fromMillis(bucket * windowMs),
        expiresAt: admin.firestore.Timestamp.fromMillis((bucket + 2) * windowMs),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

module.exports = {
  enforceRateLimit,
};
