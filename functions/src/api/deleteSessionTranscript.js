const { ok } = require("../utils/response");
const { makeCallable } = require("../utils/callableHandler");
const { assertSessionId } = require("../validators/commonValidators");
const { deleteSessionTranscript } = require("../services/chatSessionService");

/**
 * Callable: deleteSessionTranscript
 */
const deleteSessionTranscriptApi = makeCallable(async (request) => {
  const sessionId = request.data?.sessionId;
  assertSessionId(sessionId);
  await deleteSessionTranscript(sessionId);
  return ok({ deleted: true });
});

module.exports = {
  deleteSessionTranscriptApi,
};
