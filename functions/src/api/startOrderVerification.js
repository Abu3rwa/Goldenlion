const { ok } = require("../utils/response");
const { makeCallable } = require("../utils/callableHandler");
const { validateStartVerification } = require("../validators/chatValidators");
const { startVerification } = require("../services/verificationService");

/**
 * Callable: startOrderVerification
 */
const startOrderVerificationApi = makeCallable(async (request) => {
  const payload = request.data || {};
  validateStartVerification(payload);
  await startVerification(payload.sessionId, payload.orderNumber, payload.method, payload.destination);
  return ok({});
});

module.exports = {
  startOrderVerificationApi,
};
