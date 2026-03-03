const { AppError } = require("../utils/appError");
const { LOCALES } = require("../utils/constants");

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{10,80}$/;

/**
 * @param {string} value
 */
function assertSessionId(value) {
  if (!SESSION_ID_REGEX.test(value || "")) {
    throw new AppError("validation/invalid-session-id", "Invalid sessionId format.");
  }
}

/**
 * @param {string} value
 */
function assertLocale(value) {
  if (value !== LOCALES.AR && value !== LOCALES.EN) {
    throw new AppError("validation/invalid-locale", "Locale must be ar or en.");
  }
}

/**
 * @param {string} value
 * @param {number} min
 * @param {number} max
 * @param {string} label
 */
function assertTextLength(value, min, max, label) {
  const raw = `${value || ""}`.trim();
  if (raw.length < min || raw.length > max) {
    throw new AppError(
      "validation/invalid-length",
      `${label} must be between ${min} and ${max} characters.`
    );
  }
}

module.exports = {
  assertSessionId,
  assertLocale,
  assertTextLength,
};
