jest.mock("../src/services/ticketService", () => ({
  createTicket: jest.fn(async () => ({ ticketId: "TICK-1" })),
}));

jest.mock("../src/services/chatSessionService", () => ({
  deleteSessionTranscript: jest.fn(async () => {}),
}));

const { createSupportTicketApi } = require("../src/api/createSupportTicket");
const { deleteSessionTranscriptApi } = require("../src/api/deleteSessionTranscript");
const { createTicket } = require("../src/services/ticketService");
const { deleteSessionTranscript } = require("../src/services/chatSessionService");

describe("chat support and transcript APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createSupportTicket returns ticket reference", async () => {
    const result = await createSupportTicketApi({
      data: {
        sessionId: "session_abc1234567",
        contact: "Ali | ali@example.com",
        summary: "مشكلة في متابعة الطلب",
      },
      auth: { uid: "user-1" },
    });

    expect(createTicket).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.ticketId).toBe("TICK-1");
  });

  test("deleteSessionTranscript clears server transcript", async () => {
    const result = await deleteSessionTranscriptApi({
      data: { sessionId: "session_abc1234567" },
    });

    expect(deleteSessionTranscript).toHaveBeenCalledWith("session_abc1234567");
    expect(result).toEqual({ ok: true, deleted: true });
  });
});
