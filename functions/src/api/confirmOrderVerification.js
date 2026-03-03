const { ok } = require("../utils/response");
const { makeCallable } = require("../utils/callableHandler");
const { validateConfirmVerification } = require("../validators/chatValidators");
const { confirmVerification } = require("../services/verificationService");
const { signVerificationToken } = require("../utils/token");

/**
 * Callable: confirmOrderVerification
 */
const confirmOrderVerificationApi = makeCallable(async (request) => {
  const payload = request.data || {};
  validateConfirmVerification(payload);
  const orderNumber = await confirmVerification(payload.sessionId, payload.code);
  const verificationToken = signVerificationToken({
    sessionId: payload.sessionId,
    orderNumber,
    userId: request.auth?.uid || null,
  });
  return ok({ verificationToken });
});

module.exports = {
  confirmOrderVerificationApi,
};
