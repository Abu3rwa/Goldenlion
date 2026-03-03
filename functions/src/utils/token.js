const jwt = require("jsonwebtoken");
const { AppError } = require("./appError");

function getJwtSecret() {
  const secret = process.env.CHAT_JWT_SECRET;
  if (!secret) {
    throw new AppError(
      "config/missing-jwt-secret",
      "Missing CHAT_JWT_SECRET configuration.",
      500
    );
  }
  return secret;
}

/**
 * @param {Record<string, any>} payload
 * @returns {string}
 */
function signVerificationToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "10m", issuer: "goldenlion-chat" });
}

/**
 * @param {string} token
 * @returns {Record<string, any>}
 */
function verifyVerificationToken(token) {
  try {
    return jwt.verify(token, getJwtSecret(), { issuer: "goldenlion-chat" });
  } catch (error) {
    throw new AppError("auth/invalid-verification-token", "Invalid verification token.", 401);
  }
}

module.exports = {
  signVerificationToken,
  verifyVerificationToken,
};
