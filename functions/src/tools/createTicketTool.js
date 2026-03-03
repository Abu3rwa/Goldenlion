const { createTicket } = require("../services/ticketService");

/**
 * @param {{ sessionId: string, userId?: string|null, contact: string, summary: string }} args
 */
async function createTicketTool(args) {
  const ticket = await createTicket(args);
  return { type: "ticket", record: ticket };
}

module.exports = { createTicketTool };
