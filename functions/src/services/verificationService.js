const { db, admin } = require("../utils/firestore");
const { AppError } = require("../utils/appError");
const { maskContact } = require("../utils/masking");
const { OTP_LIMITS } = require("../utils/constants");
const { generateOtpCode, hashCode, safeEqualHash } = require("./otpService");

/**
 * Replace this transport with real provider integration (Twilio, SendGrid, etc.).
 * @param {"email"|"phone"} method
 * @param {string} destination
 * @param {string} code
 */
async function sendOtpStub(method, destination, code) {
  console.info("OTP dispatch", {
    method,
    destination: maskContact(destination),
    codePreview: `***${code.slice(-2)}`,
  });
}

/**
 * @param {string} sessionId
 * @param {string} orderNumber
 * @param {"email"|"phone"} method
 * @param {string} destination
 */
async function startVerification(sessionId, orderNumber, method, destination) {
  const code = generateOtpCode();
  const now = Date.now();
  await db.collection("verifications").doc(sessionId).set(
    {
      codeHash: hashCode(code),
      expiresAt: admin.firestore.Timestamp.fromMillis(now + OTP_LIMITS.EXPIRES_IN_MS),
      attempts: 0,
      lockedUntil: null,
      verified: false,
      verifiedAt: null,
      orderNumber,
      method,
      destinationHash: hashCode(destination.toLowerCase().trim()),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await sendOtpStub(method, destination, code);
}

/**
 * @param {string} sessionId
 * @param {string} code
 */
async function confirmVerification(sessionId, code) {
  const ref = db.collection("verifications").doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError("verification/not-started", "Verification has not started.", 400);
  }
  const data = snap.data();
  const now = Date.now();
  const lockMs = data.lockedUntil ? data.lockedUntil.toMillis() : 0;
  if (lockMs && lockMs > now) {
    throw new AppError("verification/locked", "Too many attempts. Try later.", 429);
  }

  if (!data.expiresAt || data.expiresAt.toMillis() < now) {
    throw new AppError("verification/expired", "Verification code expired.", 400);
  }

  const incomingHash = hashCode(`${code || ""}`.trim());
  if (!safeEqualHash(data.codeHash, incomingHash)) {
    const attempts = (data.attempts || 0) + 1;
    const patch = {
      attempts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (attempts >= OTP_LIMITS.MAX_ATTEMPTS) {
      patch.lockedUntil = admin.firestore.Timestamp.fromMillis(now + OTP_LIMITS.LOCKOUT_MS);
    }
    await ref.set(patch, { merge: true });
    throw new AppError("verification/invalid-code", "Invalid verification code.", 400, { attempts });
  }

  await ref.set(
    {
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0,
      lockedUntil: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return data.orderNumber;
}

/**
 * @param {string} sessionId
 */
async function isSessionVerified(sessionId) {
  const snap = await db.collection("verifications").doc(sessionId).get();
  if (!snap.exists) {
    return { verified: false };
  }
  const data = snap.data();
  return {
    verified: Boolean(data.verified),
    orderNumber: data.orderNumber || null,
    verifiedAt: data.verifiedAt || null,
  };
}

module.exports = {
  startVerification,
  confirmVerification,
  isSessionVerified,
};
