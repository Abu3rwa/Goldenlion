const { ok } = require("../utils/response");
const { makeCallable } = require("../utils/callableHandler");
const { validateCreateTicket } = require("../validators/chatValidators");
const { createTicket } = require("../services/ticketService");

/**
 * Callable: createSupportTicket
 */
const createSupportTicketApi = makeCallable(async (request) => {
  const payload = request.data || {};
  validateCreateTicket(payload);
  const ticket = await createTicket({
    sessionId: payload.sessionId,
    userId: request.auth?.uid || null,
    contact: payload.contact,
    summary: payload.summary,
  });
  return ok(ticket);
});

module.exports = {
  createSupportTicketApi,
};
