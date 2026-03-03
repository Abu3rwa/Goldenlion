const { db, admin } = require("../utils/firestore");

/**
 * @param {Record<string, any>} payload
 */
async function createTicket(payload) {
  const ref = await db.collection("supportTickets").add({
    sessionId: payload.sessionId,
    userId: payload.userId || null,
    contact: payload.contact,
    summary: payload.summary,
    status: "open",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const cleanContact = encodeURIComponent(payload.contact);
  return {
    ticketId: ref.id,
    whatsappLink: `https://wa.me/?text=${encodeURIComponent(`Ticket ${ref.id}: ${payload.summary}`)}`,
    emailLink: `mailto:${cleanContact}?subject=${encodeURIComponent(`Support Ticket ${ref.id}`)}&body=${encodeURIComponent(payload.summary)}`,
  };
}

module.exports = {
  createTicket,
};
