const { AppError } = require("../utils/appError");
const { CHAT_LIMITS } = require("../utils/constants");
const { assertLocale, assertSessionId, assertTextLength } = require("./commonValidators");

/**
 * @param {Record<string, any>} payload
 */
function validateChatSendMessage(payload = {}) {
  assertSessionId(payload.sessionId);
  assertLocale(payload.locale);
  assertTextLength(
    payload.message,
    CHAT_LIMITS.MIN_MESSAGE_LENGTH,
    CHAT_LIMITS.MAX_MESSAGE_LENGTH,
    "message"
  );
}

/**
 * @param {Record<string, any>} payload
 */
function validateStartVerification(payload = {}) {
  assertSessionId(payload.sessionId);
  assertTextLength(payload.orderNumber, 3, 64, "orderNumber");
  const method = payload.method;
  if (method !== "email" && method !== "phone") {
    throw new AppError("validation/invalid-method", "method must be email or phone");
  }
  assertTextLength(payload.destination, 4, 120, "destination");
}

/**
 * @param {Record<string, any>} payload
 */
function validateConfirmVerification(payload = {}) {
  assertSessionId(payload.sessionId);
  assertTextLength(payload.code, 4, 10, "code");
}

/**
 * @param {Record<string, any>} payload
 */
function validateCreateTicket(payload = {}) {
  assertSessionId(payload.sessionId);
  assertTextLength(payload.contact, 4, 120, "contact");
  assertTextLength(payload.summary, 8, 1200, "summary");
}

module.exports = {
  validateChatSendMessage,
  validateStartVerification,
  validateConfirmVerification,
  validateCreateTicket,
};
